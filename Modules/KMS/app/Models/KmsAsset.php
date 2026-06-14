<?php

namespace Modules\KMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class KmsAsset extends Model
{
    protected $table = 'kms_assets';

    protected $fillable = ['uuid', 'opd_id', 'category_id', 'title', 'description', 'file_path', 'uploaded_by', 'visibility', 'status', 'rejection_reason'];

    protected $casts = [];

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'uploaded_by');
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(KmsCategory::class, 'kms_asset_category', 'kms_asset_id', 'kms_category_id');
    }

    protected static function booted(): void
    {
        static::creating(function (Model $model): void {
            $model->uuid ??= (string) Str::uuid();
        });
    }
}