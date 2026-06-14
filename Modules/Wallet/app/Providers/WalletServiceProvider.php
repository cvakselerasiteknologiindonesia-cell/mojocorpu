<?php

namespace Modules\Wallet\Providers;

use Nwidart\Modules\Support\ModuleServiceProvider;

class WalletServiceProvider extends ModuleServiceProvider
{
    protected string $name = 'Wallet';
    protected string $nameLower = 'wallet';

    protected array $providers = [
        RouteServiceProvider::class,
    ];
}
