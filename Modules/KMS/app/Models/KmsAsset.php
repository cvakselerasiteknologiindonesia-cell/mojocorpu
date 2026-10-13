<?php

namespace Modules\KMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class KmsAsset extends Model
{
    use SoftDeletes;

    protected $table = 'kms_assets';

    protected $fillable = ['uuid', 'opd_id', 'category_id', 'title', 'description', 'file_path', 'uploaded_by', 'visibility', 'internal_scope', 'status', 'rejection_reason'];

    protected $casts = [];

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'uploaded_by');
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(KmsCategory::class, 'kms_asset_category', 'kms_asset_id', 'kms_category_id');
    }

    public function visibleOpds(): BelongsToMany
    {
        return $this->belongsToMany(\Modules\OPD\Models\OPD::class, 'kms_asset_opd', 'kms_asset_id', 'opd_id');
    }

    public function sources(): HasMany
    {
        return $this->hasMany(KmsAssetSource::class, 'kms_asset_id')->orderBy('sort_order')->orderBy('id');
    }

    public function isVisibleFor(?\App\Models\User $user): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->hasRole('super-admin') || $this->uploaded_by === $user->id) {
            return true;
        }

        if ($this->status !== 'approved') {
            return false;
        }

        if ($this->visibility === 'public') {
            return true;
        }

        if ($this->visibility !== 'internal') {
            return false;
        }

        if (($this->internal_scope ?? 'all') === 'all') {
            return true;
        }

        return filled($user->opd_id)
            && $this->visibleOpds()->where('opds.id', $user->opd_id)->exists();
    }

    protected static function booted(): void
    {
        static::creating(function (Model $model): void {
            $model->uuid ??= (string) Str::uuid();
        });
    }
}
