<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['learning_path_id', 'user_id', 'enrolled_at', 'completed_at'])]
class LearningPathEnrollment extends Model
{
    protected function casts(): array
    {
        return [
            'enrolled_at'  => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function learningPath(): BelongsTo
    {
        return $this->belongsTo(LearningPath::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function stepProgresses(): HasMany
    {
        return $this->hasMany(LearningPathStepProgress::class, 'enrollment_id');
    }
}
