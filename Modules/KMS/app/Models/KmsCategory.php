<?php

namespace Modules\KMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class KmsCategory extends Model
{
    protected $table = 'kms_categories';
    protected $fillable = ['uuid', 'name', 'slug'];

    public function assets(): BelongsToMany
    {
        return $this->belongsToMany(KmsAsset::class, 'kms_asset_category', 'kms_category_id', 'kms_asset_id');
    }

    protected static function booted(): void
    {
        static::creating(function (Model $model): void {
            $model->uuid ??= (string) Str::uuid();
        });
    }
}