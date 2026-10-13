<?php

namespace Modules\TrainingEvent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class TrainingEventSupportingDocument extends Model
{
    protected $table = 'training_event_supporting_documents';

    protected $fillable = ['training_event_id', 'original_name', 'file_path', 'mime_type', 'size'];

    protected $appends = ['file_url'];

    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path ? Storage::disk('public')->url($this->file_path) : null;
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(TrainingEvent::class, 'training_event_id');
    }
}
