<?php

namespace Modules\Store\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Modules\Store\Models\StoreItem;
use Modules\Store\Models\StorePurchase;
use Modules\Store\Services\StoreService;

class StoreController extends Controller
{
    public function __construct(private readonly StoreService $service) {}

    // ── Public / user ──────────────────────────────────────────────────────────

    /** GET /store — active items */
    public function index()
    {
        try {
            $items = StoreItem::query()
                ->where('is_active', true)
                ->withCount(['purchases as sold_count' => fn ($q) => $q->where('status', '!=', 'cancelled')])
                ->orderBy('sort_order')
                ->orderBy('price')
                ->get();

            return ApiResponse::success('Data retrieved', $items);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    /** POST /store/{uuid}/purchase */
    public function purchase(Request $request, string $uuid)
    {
        try {
            $item     = StoreItem::where('uuid', $uuid)->firstOrFail();
            $purchase = $this->service->purchase($item, $request->user()->id);

            activity('store')->event('purchased')->causedBy($request->user())->performedOn($purchase)
                ->withProperties(['item' => $item->name, 'tokens' => $item->price])
                ->log('Store item purchased');

            return ApiResponse::success('Pembelian berhasil!', $purchase, 201);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);
            return ApiResponse::error();
        }
    }

    /** GET /store/my-purchases */
    public function myPurchases(Request $request)
    {
        try {
            $purchases = StorePurchase::query()
                ->where('user_id', $request->user()->id)
                ->with('item:id,uuid,name,type,image_path')
                ->latest()
                ->paginate(20);

            return ApiResponse::success('Data retrieved', $purchases);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'user_id' => auth()->id()]);
            return ApiResponse::error();
        }
    }

    // ── Admin ──────────────────────────────────────────────────────────────────

    /** GET /store/admin/items */
    public function adminItems()
    {
        try {
            $items = StoreItem::query()
                ->withCount(['purchases as sold_count' => fn ($q) => $q->where('status', '!=', 'cancelled')])
                ->orderBy('sort_order')->orderBy('id')
                ->get();

            return ApiResponse::success('Data retrieved', $items);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    /** POST /store/admin/items */
    public function storeItem(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:150',
            'description' => 'nullable|string|max:2000',
            'type'        => 'required|in:badge,voucher,content,merchandise',
            'price'       => 'required|integer|min:1|max:1000000',
            'stock'       => 'nullable|integer|min:0',
            'is_active'   => 'boolean',
            'sort_order'  => 'integer',
        ]);

        try {
            $item = StoreItem::create($data);
            return ApiResponse::success('Item berhasil dibuat.', $item, 201);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    /** PUT /store/admin/items/{uuid} */
    public function updateItem(Request $request, string $uuid)
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:150',
            'description' => 'nullable|string|max:2000',
            'type'        => 'sometimes|in:badge,voucher,content,merchandise',
            'price'       => 'sometimes|integer|min:1|max:1000000',
            'stock'       => 'nullable|integer|min:0',
            'is_active'   => 'boolean',
            'sort_order'  => 'integer',
        ]);

        try {
            $item = StoreItem::where('uuid', $uuid)->firstOrFail();
            $item->update($data);
            return ApiResponse::success('Item diperbarui.', $item);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    /** POST /store/admin/items/{uuid}/image */
    public function uploadImage(Request $request, string $uuid)
    {
        $request->validate(['image' => 'required|image|max:2048']);

        try {
            $item = StoreItem::where('uuid', $uuid)->firstOrFail();

            if ($item->image_path) {
                Storage::disk('public')->delete($item->image_path);
            }

            $path = $request->file('image')->store('store-items', 'public');
            $item->update(['image_path' => $path]);

            return ApiResponse::success('Gambar diupload.', ['image_url' => Storage::disk('public')->url($path)]);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    /** DELETE /store/admin/items/{uuid} */
    public function destroyItem(string $uuid)
    {
        try {
            $item = StoreItem::where('uuid', $uuid)->firstOrFail();
            if ($item->image_path) Storage::disk('public')->delete($item->image_path);
            $item->delete();
            return ApiResponse::success('Item dihapus.');
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    /** GET /store/admin/purchases */
    public function adminPurchases(Request $request)
    {
        try {
            $purchases = StorePurchase::query()
                ->with(['user:id,name,nip,opd_name', 'item:id,uuid,name,type'])
                ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
                ->latest()
                ->paginate(25);

            return ApiResponse::success('Data retrieved', $purchases);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    /** PATCH /store/admin/purchases/{id}/fulfill */
    public function fulfill(Request $request, int $id)
    {
        $data = $request->validate(['note' => 'nullable|string|max:500']);

        try {
            $purchase = StorePurchase::findOrFail($id);
            $result   = $this->service->fulfill($purchase, $data['note'] ?? null);
            activity('store')->event('fulfilled')->causedBy($request->user())->performedOn($result)->log('Purchase fulfilled');
            return ApiResponse::success('Pembelian ditandai fulfilled.', $result->load('user:id,name', 'item:id,name'));
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }

    /** PATCH /store/admin/purchases/{id}/cancel */
    public function cancel(Request $request, int $id)
    {
        $data = $request->validate(['note' => 'nullable|string|max:500']);

        try {
            $purchase = StorePurchase::with('item')->findOrFail($id);
            $result   = $this->service->cancel($purchase, $data['note'] ?? null);
            activity('store')->event('cancelled')->causedBy($request->user())->performedOn($result)->log('Purchase cancelled & refunded');
            return ApiResponse::success('Pembelian dibatalkan dan token dikembalikan.', $result);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Throwable $e) {
            Log::error($e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
            return ApiResponse::error();
        }
    }
}
