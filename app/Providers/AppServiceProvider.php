<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Modules\Facilitator\Policies\FacilitatorTrainingEventPolicy;
use Modules\TrainingEvent\Models\TrainingEvent;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::useBuildDirectory('dist');
        Gate::policy(TrainingEvent::class, FacilitatorTrainingEventPolicy::class);
    }
}
