<?php

namespace App\Http\Middleware;

use App\Models\SecurityEvent;
use App\Models\SuspiciousRequest;
use App\Services\IntrusionDetectionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SuspiciousRequestDetector
{
    // Paths where body inspection is skipped (file uploads, media, and verified third-party webhooks)
    private const SKIP_BODY_PATHS = [
        'profile/avatar',
        'blog-posts/media',
        'discussion-forum/media',
        'learning-materials',
        'kms-assets',
        'payment/webhook', // [H2] Midtrans payload legitimately contains special chars; security via signature
    ];

    // Paths exempt from ALL detection (health, public static)
    private const EXEMPT_PATHS = ['health', 'up'];

    // Known malicious scanner / automation tool user agents
    private const SCANNER_UAS = [
        'sqlmap', 'nikto', 'nmap', 'masscan', 'dirbuster', 'dirb', 'gobuster',
        'wfuzz', 'hydra', 'acunetix', 'nessus', 'openvas', 'burpsuite', 'burp',
        'zgrab', 'nuclei', 'metasploit', 'havij', 'pangolin', 'w3af', 'skipfish',
        'appscan', 'arachni', 'vega', 'webscarab', 'paros', 'zap', 'owasp',
        'htttrack', 'wget', 'libwww-perl', 'python-requests', 'go-http-client',
        'curl/', 'masscan', 'zgrab', 'shodan',
    ];

    // Attack pattern groups: [label, severity, patterns[]]
    private const ATTACK_PATTERNS = [
        'sql_injection' => [
            'severity' => 'high',
            'patterns' => [
                '/union\s+select\s+/i',
                '/select\s+.+\s+from\s+/i',
                '/\'\s*(or|and)\s+[\'"]?\d/i',
                "/'\s*--/",
                '/;\s*(drop|delete|truncate|alter|create)\s+table/i',
                '/xp_cmdshell/i',
                '/into\s+outfile\s*[\'"`]/i',
                '/load_file\s*\(/i',
                '/sleep\s*\(\s*\d+\s*\)/i',
                '/benchmark\s*\(\s*\d+/i',
                '/waitfor\s+delay\s+/i',
                '/(?:or|and)\s+1\s*=\s*1/i',
                '/0x[0-9a-f]{4,}/i',                    // hex encoding
                '/char\s*\(\s*\d+\s*(?:,\s*\d+\s*)+\)/i', // char() concat
            ],
        ],
        'xss_attempt' => [
            'severity' => 'medium',
            'patterns' => [
                '/<script[\s>]/i',
                '/<\/script>/i',
                '/javascript\s*:/i',
                '/on(?:error|load|click|mouseover|focus|blur|input|change|submit|reset|keydown|keyup|drag|drop|copy|paste)\s*=/i',
                '/<iframe[\s>]/i',
                '/data\s*:\s*text\/html/i',
                '/<svg[^>]+on\w+\s*=/i',
                '/expression\s*\(/i',
                '/vbscript\s*:/i',
                '/<object[\s>]/i',
                '/<embed[\s>]/i',
                '/&#x[0-9a-f]+;/i',                    // hex HTML entities
                '/&#\d{2,5};.*on\w+/i',
            ],
        ],
        'path_traversal' => [
            'severity' => 'high',
            'patterns' => [
                '/\.\.[\/\\\\]/',
                '/%2e%2e[\/\\\\%]/i',
                '/%252e%252e/i',
                '/\.\.%2[fF]/',
                '/\.\.[%]5[cC]/',
                '/etc\/passwd/i',
                '/etc\/shadow/i',
                '/proc\/self/i',
                '/windows\/system32/i',
            ],
        ],
        'command_injection' => [
            'severity' => 'critical',
            'patterns' => [
                '/[;&|`]\s*(?:ls|cat|pwd|id|whoami|uname|echo|wget|curl|bash|sh|nc|netcat|python|perl|ruby|php)\b/i',
                '/\$\((?:ls|cat|id|whoami|uname|wget|curl|bash)[^)]*\)/i',
                '/`(?:ls|cat|id|whoami|uname|wget|curl|bash)[^`]*`/i',
                '/\/bin\/(?:sh|bash|dash|zsh)/i',
                '/\/usr\/bin\/(?:python|perl|ruby|nc)/i',
                '/(?:exec|system|passthru|shell_exec|popen|proc_open)\s*\(/i',
            ],
        ],
        'null_byte' => [
            'severity' => 'high',
            'patterns' => [
                '/%00/',
                '/\\x00/',
                '/\0/',
            ],
        ],
        'nosql_injection' => [
            'severity' => 'high',
            'patterns' => [
                '/\$(?:where|ne|gt|lt|gte|lte|in|nin|exists|regex|or|and|nor)\b/i',
                '/\{\s*["\']?\$(?:gt|lt|ne|in)\b/i',
            ],
        ],
        'ldap_injection' => [
            'severity' => 'medium',
            'patterns' => [
                '/[)(|&*\\\\].*(?:cn|ou|dc|uid|objectclass)=/i',
                '/\*\)\s*\(/i',
            ],
        ],
        'ssrf_attempt' => [
            'severity' => 'high',
            'patterns' => [
                '/https?:\/\/(?:169\.254\.169\.254|metadata\.google|localhost|127\.|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.)/i',
                '/file:\/\//i',
                '/dict:\/\//i',
                '/gopher:\/\//i',
            ],
        ],
    ];

    // Auto-block threshold: ≥ N attack hits from same IP in window (minutes)
    private const ATTACK_BLOCK_LIMIT = 3;

    private const ATTACK_BLOCK_WINDOW = 30;

    public function handle(Request $request, Closure $next): Response
    {
        $path = ltrim($request->path(), '/');

        // Skip exempt paths entirely
        foreach (self::EXEMPT_PATHS as $exempt) {
            if ($path === $exempt) {
                return $next($request);
            }
        }

        $ip = $request->ip();
        $userAgent = $request->userAgent() ?? '';

        if (app()->environment(['local', 'testing']) && in_array($ip, ['127.0.0.1', '::1'], true)) {
            return $next($request);
        }

        // 1. Scanner UA detection (critical, checked first)
        $this->checkScannerUa($ip, $path, $userAgent, $request->method());

        // 2. Attack patterns in URL + query string (always)
        $targets = [
            'url' => $request->fullUrl(),
            'query' => $request->getQueryString() ?? '',
        ];

        // 3. Body inspection (skip file upload endpoints)
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH'], true)) {
            $skipBody = false;
            foreach (self::SKIP_BODY_PATHS as $skip) {
                if (str_contains($path, $skip)) {
                    $skipBody = true;
                    break;
                }
            }
            if (! $skipBody) {
                $targets['body'] = substr((string) $request->getContent(), 0, 3000);
            }
        }

        foreach (self::ATTACK_PATTERNS as $type => $config) {
            foreach ($config['patterns'] as $pattern) {
                foreach ($targets as $source => $value) {
                    if ($value && preg_match($pattern, $value)) {
                        $snippet = $this->extractSnippet($value, $pattern);
                        $this->recordAttack($ip, $request->method(), $path, $userAgent, $type, $config['severity'], $pattern, $snippet);
                        break 2; // one event per type per request
                    }
                }
            }
        }

        return $next($request);
    }

    // Run AFTER response to catch 404 enumeration
    public function terminate(Request $request, Response $response): void
    {
        if ($response->getStatusCode() === 404) {
            $ip = $request->ip();
            $path = ltrim($request->path(), '/');

            $recent404s = SuspiciousRequest::where('ip_address', $ip)
                ->where('attack_type', 'enumeration_404')
                ->where('created_at', '>=', now()->subMinutes(10))
                ->count();

            // Log 404 every time
            SuspiciousRequest::create([
                'ip_address' => $ip,
                'method' => $request->method(),
                'path' => $path,
                'user_agent' => $request->userAgent(),
                'attack_type' => 'enumeration_404',
                'severity' => 'low',
            ]);

            // Escalate only when threshold crossed
            if ($recent404s >= 20) {
                $alreadyFlagged = SecurityEvent::where('type', 'enumeration_attack')
                    ->where('ip_address', $ip)
                    ->where('resolved', false)
                    ->where('created_at', '>=', now()->subMinutes(10))
                    ->exists();

                if (! $alreadyFlagged) {
                    SecurityEvent::create([
                        'type' => 'enumeration_attack',
                        'severity' => 'medium',
                        'ip_address' => $ip,
                        'description' => "Endpoint enumeration: {$recent404s}+ 404 responses sent to IP {$ip} in 10 minutes.",
                        'metadata' => ['count_404' => $recent404s + 1, 'window_minutes' => 10],
                    ]);
                }
            }
        }
    }

    private function checkScannerUa(string $ip, string $path, string $ua, string $method): void
    {
        $uaLower = strtolower($ua);
        foreach (self::SCANNER_UAS as $scanner) {
            if (str_contains($uaLower, $scanner)) {
                $this->recordAttack($ip, $method, $path, $ua, 'scanner_detected', 'critical', $scanner, "UA: {$ua}");

                return;
            }
        }
    }

    private function recordAttack(
        string $ip,
        string $method,
        string $path,
        string $ua,
        string $type,
        string $severity,
        string $pattern,
        ?string $snippet
    ): void {
        SuspiciousRequest::create([
            'ip_address' => $ip,
            'method' => $method,
            'path' => $path,
            'user_agent' => substr($ua, 0, 500),
            'attack_type' => $type,
            'severity' => $severity,
            'pattern_matched' => substr($pattern, 0, 255),
            'payload_snippet' => $snippet,
        ]);

        // Create security event if not already flagged for this IP+type recently
        $window = $type === 'enumeration_404' ? 10 : 30;
        $alreadyFlagged = SecurityEvent::where('type', $type)
            ->where('ip_address', $ip)
            ->where('resolved', false)
            ->where('created_at', '>=', now()->subMinutes($window))
            ->exists();

        if (! $alreadyFlagged) {
            $label = str_replace('_', ' ', ucfirst($type));
            SecurityEvent::create([
                'type' => $type,
                'severity' => $severity,
                'ip_address' => $ip,
                'description' => "{$label} detected from IP {$ip}: {$path}",
                'metadata' => ['pattern' => $pattern, 'path' => $path, 'method' => $method, 'snippet' => $snippet],
            ]);
        }

        // Auto-block if this IP has repeatedly triggered attacks
        $this->maybeAutoBlock($ip, $severity);
    }

    private function maybeAutoBlock(string $ip, string $severity): void
    {
        // Scanner or command injection → immediate block
        if (in_array($severity, ['critical'], true)) {
            $ids = app(IntrusionDetectionService::class);
            if (! $ids->isBlocked($ip)) {
                $ids->blockIp($ip, 'Auto-blocked: critical attack pattern detected', 'auto', now()->addHours(24));
            }

            return;
        }

        // Repeated high/medium attacks within window → block
        $recentAttacks = SuspiciousRequest::where('ip_address', $ip)
            ->whereNotIn('attack_type', ['enumeration_404'])
            ->where('created_at', '>=', now()->subMinutes(self::ATTACK_BLOCK_WINDOW))
            ->count();

        if ($recentAttacks >= self::ATTACK_BLOCK_LIMIT) {
            $ids = app(IntrusionDetectionService::class);
            if (! $ids->isBlocked($ip)) {
                $ids->blockIp($ip, "Auto-blocked: {$recentAttacks} attack attempts in ".self::ATTACK_BLOCK_WINDOW.' min', 'auto', now()->addHours(6));

                SecurityEvent::create([
                    'type' => 'repeated_attacks',
                    'severity' => 'critical',
                    'ip_address' => $ip,
                    'description' => "IP {$ip} auto-blocked after {$recentAttacks} attack pattern detections in ".self::ATTACK_BLOCK_WINDOW.' minutes.',
                    'metadata' => ['attack_count' => $recentAttacks, 'window_minutes' => self::ATTACK_BLOCK_WINDOW],
                ]);
            }
        }
    }

    private function extractSnippet(string $value, string $pattern): ?string
    {
        if (! preg_match($pattern, $value, $m, PREG_OFFSET_CAPTURE)) {
            return null;
        }
        $offset = $m[0][1];
        $start = max(0, $offset - 20);
        $raw = substr($value, $start, 80);

        return '…'.preg_replace('/[\r\n]+/', ' ', $raw).'…';
    }
}
