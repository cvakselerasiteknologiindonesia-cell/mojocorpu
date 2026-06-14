<?php

namespace Modules\Store\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class StorePurchase extends Model
{
    protected $table = 'store_purchases';

    protected $fillable = ['uuid', 'user_id', 'store_item_id', 'tokens_spent', 'status', 'note', 'fulfilled_at'];

    protected $casts = ['fulfilled_at' => 'datetime', 'tokens_spent' => 'integer'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(StoreItem::class, 'store_item_id');
    }

    protected static function booted(): void
    {
        static::creating(fn ($m) => $m->uuid ??= (string) Str::uuid());
    }
}
