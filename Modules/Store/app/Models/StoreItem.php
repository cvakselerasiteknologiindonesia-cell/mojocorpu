<?php

namespace Modules\Store\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StoreItem extends Model
{
    protected $table = 'store_items';

    protected $fillable = ['uuid', 'name', 'description', 'type', 'price', 'stock', 'image_path', 'is_active', 'sort_order'];

    protected $casts = ['is_active' => 'boolean', 'price' => 'integer', 'stock' => 'integer', 'sort_order' => 'integer'];

    protected $appends = ['image_url', 'is_available'];

    public function purchases(): HasMany
    {
        return $this->hasMany(StorePurchase::class);
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? Storage::disk('public')->url($this->image_path) : null;
    }

    public function getIsAvailableAttribute(): bool
    {
        return $this->is_active && ($this->stock === null || $this->stock > 0);
    }

    protected static function booted(): void
    {
        static::creating(fn ($m) => $m->uuid ??= (string) Str::uuid());
    }
}
