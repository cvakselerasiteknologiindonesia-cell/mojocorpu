<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable([
    'uuid', 'learning_path_id', 'order', 'title', 'description',
    'type', 'reference_id', 'is_required', 'estimated_minutes',
])]
class LearningPathStep extends Model
{
    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    protected function casts(): array
    {
        return ['is_required' => 'boolean'];
    }

    public function learningPath(): BelongsTo
    {
        return $this->belongsTo(LearningPath::class);
    }

    public function progresses(): HasMany
    {
        return $this->hasMany(LearningPathStepProgress::class, 'step_id');
    }
}
