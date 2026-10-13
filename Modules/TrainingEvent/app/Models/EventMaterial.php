<?php

namespace Modules\TrainingEvent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventMaterial extends Model
{
    protected $table = 'event_materials';

    protected $fillable = ['training_event_id', 'title', 'type', 'url', 'file_path', 'description', 'duration_minutes', 'order'];

    protected $appends = ['file_url'];

    public function getFileUrlAttribute(): ?string
    {
        if (! $this->file_path) {
            return null;
        }
        if (filter_var($this->file_path, FILTER_VALIDATE_URL)) {
            return $this->file_path;
        }

        // Serve via authenticated download route [M3 fix]
        return url("/api/event-materials/{$this->id}/download");
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(TrainingEvent::class, 'training_event_id');
    }
}
