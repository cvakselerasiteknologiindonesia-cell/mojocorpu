<?php

namespace Modules\TrainingEvent\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventParticipant extends Model
{
    protected $table = 'event_participants';

    protected $fillable = [
        'training_event_id', 'user_id', 'status', 'enrolled_at', 'completed_at',
        'completion_status', 'approved_by', 'approved_at', 'rejection_reason',
    ];

    protected $casts = [
        'enrolled_at'  => 'datetime',
        'completed_at' => 'datetime',
        'approved_at'  => 'datetime',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(TrainingEvent::class, 'training_event_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
