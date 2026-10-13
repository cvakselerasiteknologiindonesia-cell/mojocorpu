<?php

namespace Modules\KMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KmsAssetSource extends Model
{
    protected $table = 'kms_asset_sources';

    protected $fillable = [
        'kms_asset_id',
        'file_path',
        'source_type',
        'original_name',
        'sort_order',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(KmsAsset::class, 'kms_asset_id');
    }
}
