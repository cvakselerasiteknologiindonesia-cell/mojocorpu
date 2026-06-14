<?php

namespace Modules\Facilitator\Policies;

use App\Models\User;
use App\Policies\BaseCorporatePolicy;
use Modules\Facilitator\Models\Facilitator;
use Modules\TrainingEvent\Models\TrainingEvent;

class FacilitatorTrainingEventPolicy extends BaseCorporatePolicy
{
    public function view(User $user, TrainingEvent $event): bool
    {
        return $this->ownsClass($user, $event)
            && $user->hasAnyPermission(['view own training events', 'view assigned training events']);
    }

    public function update(User $user, TrainingEvent $event): bool
    {
        return $this->ownsClass($user, $event)
            && $user->can('update own learning sessions');
    }

    public function uploadMaterial(User $user, TrainingEvent $event): bool
    {
        return $this->ownsClass($user, $event)
            && $user->can('upload learning materials');
    }

    public function manageAssessment(User $user, TrainingEvent $event): bool
    {
        return $this->ownsClass($user, $event)
            && $user->hasAnyPermission(['create quiz', 'manage assessments', 'evaluate participants']);
    }

    private function ownsClass(User $user, TrainingEvent $event): bool
    {
        $facilitatorId = Facilitator::query()->where('user_id', $user->id)->value('id');

        return $facilitatorId && (int) $event->facilitator_id === (int) $facilitatorId;
    }
}
