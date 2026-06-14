<?php

namespace Modules\TrainingProposal\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Modules\TrainingEvent\Models\TrainingEvent;

class TrainingProposal extends Model
{
    protected $table = 'training_proposals';

    protected $fillable = ['uuid', 'opd_id', 'title', 'description', 'recommendation', 'proposed_by', 'status'];

    protected static function booted(): void
    {
        static::creating(function (Model $model): void {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function proposer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'proposed_by');
    }

    public function trainingEvents(): HasMany
    {
        return $this->hasMany(TrainingEvent::class, 'training_proposal_id');
    }
}
