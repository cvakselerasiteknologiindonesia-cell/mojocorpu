<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SsoRedirectFallbackTest extends TestCase
{
    public function test_user_is_returned_to_local_login_when_jakarta_sso_is_unavailable(): void
    {
        Http::fake([
            '127.0.0.1:8000/api/health' => Http::response(null, 503),
        ]);

        $this->get('/auth/sso/redirect')
            ->assertRedirect('/?sso_unavailable=1');
    }
}
