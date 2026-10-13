<?php

namespace Modules\TrainingEvent\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Certificate\Models\CertificateTemplate;
use Modules\Facilitator\Models\Facilitator;
use Modules\OPD\Models\OPD;
use Modules\TrainingProposal\Models\TrainingProposal;

class TrainingEvent extends Model
{
    protected $table = 'training_events';

    protected $fillable = ['uuid', 'training_proposal_id', 'title', 'description', 'location', 'facilitator_id', 'start_date', 'end_date', 'quota', 'is_paid', 'price', 'status', 'banner_image', 'certificate_template_id', 'target_all_opds'];

    protected $appends = ['banner_url'];

    protected $casts = ['start_date' => 'datetime', 'end_date' => 'datetime', 'is_paid' => 'boolean', 'target_all_opds' => 'boolean'];

    public function getBannerUrlAttribute(): ?string
    {
        return $this->banner_image ? Storage::disk('public')->url($this->banner_image) : null;
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(EventSession::class)->orderBy('order');
    }

    public function materials(): HasMany
    {
        return $this->hasMany(EventMaterial::class)->orderBy('order');
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(EventAssessment::class)->orderBy('type');
    }

    public function participants(): HasMany
    {
        // ->with('user') intentionally removed — it was causing over-eager-loading
        // everywhere $event->participants was accessed, even when user data was not
        // needed (e.g. quota checks, count queries). Callers that need user data
        // should eager-load it explicitly: $event->load('participants.user:id,name,nip').
        return $this->hasMany(EventParticipant::class)->orderBy('enrolled_at');
    }

    public function supportingDocuments(): HasMany
    {
        return $this->hasMany(TrainingEventSupportingDocument::class, 'training_event_id')->latest('id');
    }

    public function certificateTemplate(): BelongsTo
    {
        return $this->belongsTo(CertificateTemplate::class, 'certificate_template_id');
    }

    public function proposal(): BelongsTo
    {
        return $this->belongsTo(TrainingProposal::class, 'training_proposal_id');
    }

    public function facilitator(): BelongsTo
    {
        return $this->belongsTo(Facilitator::class);
    }

    public function facilitators(): BelongsToMany
    {
        return $this->belongsToMany(
            Facilitator::class,
            'training_event_facilitators'
        )->withTimestamps();
    }

    public function targetOpds(): BelongsToMany
    {
        return $this->belongsToMany(
            OPD::class,
            'training_event_target_opds',
            'training_event_id',
            'opd_id'
        )->withTimestamps();
    }

    public function targetUsers(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'training_event_target_users',
            'training_event_id',
            'user_id'
        )->withTimestamps();
    }

    protected static function booted(): void
    {
        static::creating(function (Model $model): void {
            $model->uuid ??= (string) Str::uuid();
        });
    }
}
