<?php

return [
    'postmark' => ['key' => env('POSTMARK_API_KEY')],
    'resend' => ['key' => env('RESEND_API_KEY')],
    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],
    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
    'sso' => [
        'driver' => env('CORPU_SSO_DRIVER', 'internal'),
        'base_url' => env('CORPU_SSO_URL', 'http://127.0.0.1:8000'),
        'realm' => env('CORPU_SSO_REALM'),
        'scopes' => env('CORPU_SSO_SCOPES', 'openid profile email'),
        'validate_token_path' => env('CORPU_SSO_VALIDATE_PATH', '/api/sso/validate-token'),
        'authorize_path' => env('CORPU_SSO_AUTHORIZE_PATH', '/oauth/authorize'),
        'token_path' => env('CORPU_SSO_TOKEN_PATH', '/api/oauth/token'),
        'userinfo_path' => env('CORPU_SSO_USERINFO_PATH'),
        'health_path' => env('CORPU_SSO_HEALTH_PATH', '/api/health'),
        'client_id' => env('CORPU_SSO_CLIENT_ID'),
        'client_secret' => env('CORPU_SSO_CLIENT_SECRET'),
        'redirect_uri' => env('CORPU_SSO_REDIRECT_URI', 'http://127.0.0.1:8001/auth/sso/callback'),
        'service_token' => env('CORPU_SSO_SERVICE_TOKEN'),
        'internal_opds_path' => '/api/internal/opds',
    ],
    'simpeg' => [
        'base_url' => env('SIMPEG_API_URL', 'https://api-simpeg.mojokertokab.go.id'),
        'satker_all_path' => env('SIMPEG_SATKER_ALL_PATH', '/api/get-satker-all'),
        'satker_child_path' => env('SIMPEG_SATKER_CHILD_PATH', '/api/get-satker-child'),
        'cache_ttl' => (int) env('SIMPEG_CACHE_TTL', 3600),
    ],
];
