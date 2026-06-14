<?php

namespace Modules\Quiz\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class QuizAttempt extends Model
{
    protected $table = 'quiz_attempts';

    protected $fillable = ['uuid', 'quiz_id', 'user_id', 'score', 'answers', 'submitted_at'];

    protected $casts = ['answers' => 'array', 'submitted_at' => 'datetime'];

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class);
    }

    protected static function booted(): void
    {
        static::creating(function (Model $model): void {
            $model->uuid ??= (string) Str::uuid();
        });
    }
}
