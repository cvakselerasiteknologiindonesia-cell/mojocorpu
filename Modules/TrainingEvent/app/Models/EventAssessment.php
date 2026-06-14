<?php

namespace Modules\TrainingEvent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\TrainingEvent\Models\AssessmentSubmission;

class EventAssessment extends Model
{
    protected $table = 'event_assessments';

    protected $fillable = ['training_event_id', 'type', 'title', 'instructions', 'passing_score', 'time_limit_minutes', 'status', 'bank_draw_count'];

    protected $casts = ['bank_draw_count' => 'integer'];

    protected $withCount = ['questions'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(TrainingEvent::class, 'training_event_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(AssessmentQuestion::class, 'event_assessment_id')->orderBy('order');
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(AssessmentSubmission::class, 'event_assessment_id');
    }
}
