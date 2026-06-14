<?php

namespace Modules\DiscussionForum\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class DiscussionThread extends Model
{
    protected $table = 'discussion_threads';

    protected $fillable = ['uuid', 'training_event_id', 'created_by', 'title', 'body', 'status'];

    protected static function booted(): void
    {
        static::creating(function (Model $model): void {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(DiscussionComment::class, 'thread_id');
    }

    public function trainingEvent(): BelongsTo
    {
        return $this->belongsTo(\Modules\TrainingEvent\Models\TrainingEvent::class, 'training_event_id');
    }
}
