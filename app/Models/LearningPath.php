<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Modules\Certificate\Models\CertificateTemplate;

#[Fillable([
    'uuid', 'title', 'slug', 'description', 'thumbnail_url',
    'status', 'target_role', 'estimated_hours', 'is_sequential',
    'certificate_template_id', 'created_by',
])]
class LearningPath extends Model
{
    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->uuid ??= (string) Str::uuid();
            if (empty($model->slug)) {
                $model->slug = Str::slug($model->title).'-'.substr($model->uuid, 0, 8);
            }
        });
    }

    protected function casts(): array
    {
        return ['is_sequential' => 'boolean'];
    }

    public function steps(): HasMany
    {
        return $this->hasMany(LearningPathStep::class)->orderBy('order');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(LearningPathEnrollment::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function certificateTemplate(): BelongsTo
    {
        return $this->belongsTo(CertificateTemplate::class, 'certificate_template_id');
    }
}
