<?php

namespace Modules\TrainingEvent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventSession extends Model
{
    protected $table = 'event_sessions';

    protected $fillable = ['training_event_id', 'title', 'description', 'start_date', 'end_date', 'order', 'duration_minutes', 'status'];

    protected $casts = ['start_date' => 'datetime', 'end_date' => 'datetime'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(TrainingEvent::class, 'training_event_id');
    }

    public function attendances(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(SessionAttendance::class, 'event_session_id');
    }
}
