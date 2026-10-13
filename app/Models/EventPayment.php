<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\TrainingEvent\Models\TrainingEvent;

class EventPayment extends Model
{
    protected $table = 'event_payments';

    protected $fillable = [
        'training_event_id', 'user_id', 'order_id',
        'amount', 'status', 'snap_token', 'payment_type', 'paid_at',
    ];

    protected $casts = ['paid_at' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(TrainingEvent::class, 'training_event_id');
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }
}
