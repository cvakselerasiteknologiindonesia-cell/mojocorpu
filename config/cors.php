<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // [H4] Batasi ke domain resmi — jangan wildcard di production
    'allowed_origins' => array_filter(array_unique([
        env('APP_URL'),
        env('CORPU_SSO_URL'),
        // tambahkan domain lain jika perlu, misal mobile app origin
    ])),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'X-Requested-With', 'Authorization', 'Accept', 'X-XSRF-TOKEN'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
