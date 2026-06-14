<?php

namespace Modules\Store\Providers;

use Nwidart\Modules\Support\ModuleServiceProvider;

class StoreServiceProvider extends ModuleServiceProvider
{
    protected string $name = 'Store';
    protected string $nameLower = 'store';
    protected array $providers = [RouteServiceProvider::class];
}
