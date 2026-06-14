<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['enrollment_id', 'step_id', 'completed_at'])]
class LearningPathStepProgress extends Model
{
    protected function casts(): array
    {
        return ['completed_at' => 'datetime'];
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(LearningPathEnrollment::class);
    }

    public function step(): BelongsTo
    {
        return $this->belongsTo(LearningPathStep::class);
    }
}
