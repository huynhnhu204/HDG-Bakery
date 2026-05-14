<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Product extends Model
{
    use HasFactory;

    protected $table = 'product';
    public $timestamps = false;

    protected $fillable = [
        'category_id','name','slug','thumbnail','image',
        'content','description','price_buy',
        'quantity','unit',       // ✅ số lượng + đơn vị
        'type','weight',         // ✅ dùng cho lọc
        'product_new','status',
        'created_at','created_by','updated_at','updated_by'
    ];

    // Các field ảo sẽ tự động được trả ra JSON
    protected $appends = [
        'image_url','effective_price','discount_value',
        'content_html','meta','sku','channels','tags','nutrition',
        'available_from','best_before_days','weight_gram',
        'available_quantity','is_in_stock'
    ];

    protected $casts = [
        'product_new'       => 'boolean',
        'status'            => 'integer',
        'price_buy'         => 'float',
        'quantity'          => 'float',
    ];

    /* =========================================================
     | Helpers: parse content JSON -> ['html' => ..., 'meta' => []]
     * ========================================================= */
    protected function parseContent(): array
    {
        $html = $this->attributes['content'] ?? '';
        $meta = [];

        if (is_string($html)) {
            $decoded = json_decode($html, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $html = $decoded['html'] ?? '';
                $meta = $decoded['meta'] ?? [];
            }
        }
        return ['html' => $html, 'meta' => $meta];
    }

    /* =========================================================
     | Accessors gốc
     * ========================================================= */
    public function getImageUrlAttribute(): ?string
    {
        $src = $this->thumbnail ?: $this->image;
        if (!$src) return null;

        if (str_starts_with($src, 'http')) {
            return $src;
        }

        // Nếu bắt đầu với storage/, chuyển thành /api/v1/storage/
        if (str_starts_with($src, 'storage/')) {
            return url('/api/v1/' . $src);
        }

        return asset($src);
    }

    public function getEffectivePriceAttribute(): float
    {
        $base = (float)($this->price_buy ?? 0);

        // Nếu có giá mua, trả về giá mua
        if ($base > 0) {
            return $base;
        }

        // Nếu không có giá mua, kiểm tra variant
        $variant = null;
        if ($this->relationLoaded('variants')) {
            $variant = $this->variants
                ->filter(fn ($v) => (int)$v->status === 1)
                ->sortBy([['is_default', 'desc'], ['sort_order', 'asc']])
                ->first();
        } else {
            $variant = $this->variants()
                ->where('status', 1)
                ->orderByDesc('is_default')
                ->orderBy('sort_order')
                ->first();
        }

        return $variant ? (float)$variant->effective_price : 0.0;
    }

    public function getDiscountValueAttribute(): float
    {
        // Không có sale nữa, luôn trả về 0
        return 0;
    }

    /* =========================================================
     | Accessors meta (đọc từ content JSON)
     * ========================================================= */
    public function getContentHtmlAttribute(): string
    {
        return $this->parseContent()['html'] ?? '';
    }

    public function getMetaAttribute(): array
    {
        return $this->parseContent()['meta'] ?? [];
    }

    // Các field ảo tiện cho FE dùng trực tiếp
    public function getSkuAttribute(): ?string
    {
        return $this->meta['sku'] ?? null;
    }

    public function getChannelsAttribute(): array
    {
        return $this->meta['channels'] ?? [];
    }

    public function getTagsAttribute(): array
    {
        return $this->meta['tags'] ?? [];
    }

    public function getNutritionAttribute(): array
    {
        return $this->meta['nutrition'] ?? [];
    }

    public function getAvailableFromAttribute(): ?string
    {
        return $this->meta['availableFrom'] ?? null;
    }

    public function getBestBeforeDaysAttribute(): ?int
    {
        return $this->meta['bestBeforeDays'] ?? null;
    }

    public function getWeightGramAttribute(): ?int
    {
        return $this->meta['weightGram'] ?? null;
    }

    public function getAvailableQuantityAttribute(): int
    {
        return $this->getAvailableQuantity();
    }

    public function getIsInStockAttribute(): bool
    {
        return $this->isInStock();
    }

    /* =========================================================
     | Quan hệ (tuỳ DB của bạn)
     * ========================================================= */
    public function category()  { return $this->belongsTo(Category::class,'category_id'); }
    public function images()    { return $this->hasMany(ProductImage::class,'product_id'); }
    public function attributes(){ return $this->hasMany(ProductAttribute::class,'product_id'); }
    public function variants()
    {
        return $this->hasMany(ProductVariant::class, 'product_id')
            ->orderByDesc('is_default')
            ->orderBy('sort_order')
            ->orderBy('id');
    }
    public function stockHistory(){ return $this->hasMany(ProductStore::class,'product_id'); }

    /**
     * Tính số lượng tồn kho hiện tại (SUM qty từ product_store)
     */
    public function getAvailableQuantity(): int
    {
        return (int) $this->stockHistory()->sum('qty');
    }

    /**
     * Kiểm tra còn hàng hay không
     */
    public function isInStock(): bool
    {
        return $this->getAvailableQuantity() > 0;
    }

    /**
     * Trừ số lượng khi bán hàng
     */
    public function decreaseStock(int $qty, string $refType, $refId, $note = null): bool
    {
        try {
            ProductStore::create([
                'product_id' => $this->id,
                'price_root' => 0,
                'qty' => -abs($qty), // Số âm để trừ tồn kho
                'type' => 'OUT',
                'ref_type' => $refType,
                'ref_id' => $refId,
                'note' => $note ?? "Bán hàng",
                'status' => 1,
            ]);
            return true;
        } catch (\Exception $e) {
            \Log::error("Failed to decrease stock for product {$this->id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Giữ chỗ tồn kho khi tạo đơn (RESERVE)
     * Ghi số âm để trừ tồn khả dụng, có thể hoàn lại khi huỷ
     */
    public function reserveStock(int $qty, string $refType, $refId, $note = null): bool
    {
        try {
            ProductStore::create([
                'product_id' => $this->id,
                'price_root' => 0,
                'qty'        => -abs($qty),
                'type'       => 'RESERVE',
                'ref_type'   => $refType,
                'ref_id'     => $refId,
                'note'       => $note ?? 'Giữ chỗ đơn hàng',
                'status'     => 1,
            ]);
            return true;
        } catch (\Exception $e) {
            \Log::error("Failed to reserve stock for product {$this->id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Hoàn lại tồn kho khi huỷ đơn (RELEASE)
     * Ghi số dương để bù lại reservation trước đó
     */
    public function releaseStock(int $qty, string $refType, $refId, $note = null): bool
    {
        try {
            ProductStore::create([
                'product_id' => $this->id,
                'price_root' => 0,
                'qty'        => abs($qty),
                'type'       => 'RELEASE',
                'ref_type'   => $refType,
                'ref_id'     => $refId,
                'note'       => $note ?? 'Hoàn tồn do huỷ đơn',
                'status'     => 1,
            ]);
            return true;
        } catch (\Exception $e) {
            \Log::error("Failed to release stock for product {$this->id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Chốt tồn kho: chuyển các bút toán RESERVE của chứng từ thành OUT (không trừ thêm)
     */
    public function commitReserved(string $refType, $refId): bool
    {
        try {
            ProductStore::where('product_id', $this->id)
                ->where('ref_type', $refType)
                ->where('ref_id', $refId)
                ->where('type', 'RESERVE')
                ->update([
                    'type' => 'OUT',
                    'updated_at' => now(),
                ]);
            return true;
        } catch (\Throwable $e) {
            \Log::warning('Commit reserved stock failed for product '.$this->id.' ref '.$refType.'#'.$refId.': '.$e->getMessage());
            return false;
        }
    }

    // Scope
    public function scopeActive($q) { return $q->where('status',1); }
}
