<?php

namespace Modules\TrainingEvent\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentSubmission extends Model
{
    protected $fillable = ['event_assessment_id', 'user_id', 'answers', 'score', 'is_passed', 'submitted_at'];

    protected $casts = [
        'answers'      => 'array',
        'is_passed'    => 'boolean',
        'submitted_at' => 'datetime',
    ];

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(EventAssessment::class, 'event_assessment_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
