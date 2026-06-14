<?php

namespace Modules\TrainingEvent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentQuestion extends Model
{
    protected $table = 'assessment_questions';

    protected $fillable = ['event_assessment_id', 'question', 'type', 'options', 'correct_answer', 'points', 'order', 'in_bank'];

    protected $casts = ['options' => 'array', 'in_bank' => 'boolean'];

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(EventAssessment::class, 'event_assessment_id');
    }
}
