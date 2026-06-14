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
        'base_url' => env('CORPU_SSO_URL', 'http://127.0.0.1:8000'),
        'validate_token_path' => env('CORPU_SSO_VALIDATE_PATH', '/api/sso/validate-token'),
        'authorize_path' => env('CORPU_SSO_AUTHORIZE_PATH', '/oauth/authorize'),
        'token_path' => env('CORPU_SSO_TOKEN_PATH', '/api/oauth/token'),
        'health_path' => env('CORPU_SSO_HEALTH_PATH', '/api/health'),
        'client_id' => env('CORPU_SSO_CLIENT_ID', 'bkpsdm-corpu'),
        'client_secret' => env('CORPU_SSO_CLIENT_SECRET', 'bkpsdm-corpu-secret'),
        'redirect_uri' => env('CORPU_SSO_REDIRECT_URI', 'http://127.0.0.1:8001/auth/sso/callback'),
        'service_token' => env('CORPU_SSO_SERVICE_TOKEN'),
        'internal_opds_path' => '/api/internal/opds',
    ],
];
