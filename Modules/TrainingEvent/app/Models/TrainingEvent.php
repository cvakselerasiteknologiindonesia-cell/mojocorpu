<?php

namespace Modules\TrainingEvent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TrainingEvent extends Model
{
    protected $table = 'training_events';

    protected $fillable = ['uuid', 'training_proposal_id', 'title', 'description', 'location', 'facilitator_id', 'start_date', 'end_date', 'quota', 'status', 'banner_image', 'certificate_template_id'];

    protected $appends = ['banner_url'];

    protected $casts = ['start_date' => 'datetime', 'end_date' => 'datetime'];

    public function getBannerUrlAttribute(): ?string
    {
        return $this->banner_image ? Storage::disk('public')->url($this->banner_image) : null;
    }

    public function sessions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EventSession::class)->orderBy('order');
    }

    public function materials(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EventMaterial::class)->orderBy('order');
    }

    public function assessments(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EventAssessment::class)->orderBy('type');
    }

    public function participants(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EventParticipant::class)->with('user:id,name,email,nip')->orderBy('enrolled_at');
    }

    public function certificateTemplate(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\Modules\Certificate\Models\CertificateTemplate::class, 'certificate_template_id');
    }

    public function facilitator(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\Modules\Facilitator\Models\Facilitator::class);
    }

    public function facilitators(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(
            \Modules\Facilitator\Models\Facilitator::class,
            'training_event_facilitators'
        )->withTimestamps();
    }

    protected static function booted(): void
    {
        static::creating(function (Model $model): void {
            $model->uuid ??= (string) Str::uuid();
        });
    }
}