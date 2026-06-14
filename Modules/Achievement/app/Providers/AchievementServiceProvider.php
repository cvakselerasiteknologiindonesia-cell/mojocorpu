<?php

namespace Modules\Achievement\Providers;

use Nwidart\Modules\Support\ModuleServiceProvider;

class AchievementServiceProvider extends ModuleServiceProvider
{
    protected string $name = 'Achievement';
    protected string $nameLower = 'achievement';
    protected array $providers = [RouteServiceProvider::class];
}
