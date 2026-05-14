<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use App\Models\ProductStore;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /* =========================================================
     | Helpers: pack/unpack content JSON (không đụng DB)
     * ========================================================= */
    private function packContent(?string $html, array $meta): string
    {
        $payload = ['html' => $html ?? '', 'meta' => $meta];
        return json_encode($payload, JSON_UNESCAPED_UNICODE);
    }

    private function unpackContent($product): array
    {
        $html = $product->content;
        $meta = [];

        if (is_string($product->content)) {
            $decoded = json_decode($product->content, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $html = $decoded['html'] ?? '';
                $meta = $decoded['meta'] ?? [];
            }
        }
        return [$html, $meta];
    }

    private function sanitizeVariantInput(array $variant): ?array
    {
        $name = trim((string)($variant['name'] ?? ''));
        if ($name === '') {
            return null;
        }

        if (!array_key_exists('price', $variant)) {
            return null;
        }

        $price = max(0, (float)$variant['price']);
        $priceSale = isset($variant['price_sale']) ? max(0, (float)$variant['price_sale']) : 0.0;

        return [
            'id'          => isset($variant['id']) ? (int)$variant['id'] : null,
            'name'        => $name,
            'sku'         => trim((string)($variant['sku'] ?? '')),
            'price'       => $price,
            'price_sale'  => $priceSale,
            'stock'       => isset($variant['stock']) ? max(0, (int)$variant['stock']) : 0,
            'status'      => array_key_exists('status', $variant) ? (int)!!$variant['status'] : 1,
            'is_default'  => !empty($variant['is_default']),
            'weight_gram' => isset($variant['weight_gram']) ? max(0, (int)$variant['weight_gram']) : null,
            'sort_order'  => isset($variant['sort_order']) ? max(0, (int)$variant['sort_order']) : 0,
        ];
    }

    private function generateVariantSku(Product $product, array &$usedSkus): string
    {
        $base = Str::upper(Str::slug($product->slug ?: $product->name ?: 'SKU'));
        if ($base === '') {
            $base = 'SKU';
        }
        $base = substr($base, 0, 12);

        do {
            $candidate = $base . '-' . Str::upper(Str::random(4));
        } while (in_array($candidate, $usedSkus, true) || ProductVariant::where('sku', $candidate)->exists());

        $usedSkus[] = $candidate;
        return $candidate;
    }

    private function refreshProductPrice(Product $product): void
    {
        $primary = $product->variants()
            ->where('status', 1)
            ->orderByDesc('is_default')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->first();

        $priceBuy  = $product->price_buy ?? 0;

        if ($primary) {
            $priceBuy = $primary->price ?? 0;
        }

        $changes = [];
        if ((float)$product->price_buy !== (float)$priceBuy) {
            $changes['price_buy'] = $priceBuy;
        }

        if (!empty($changes)) {
            $changes['updated_at'] = now();
            $product->fill($changes)->save();
        }
    }

    private function syncVariants(Product $product, array $variants): void
    {
        $prepared = [];
        foreach ($variants as $variant) {
            $clean = $this->sanitizeVariantInput((array)$variant);
            if ($clean) {
                $prepared[] = $clean;
            }
        }

        if (empty($prepared)) {
            if ($product->variants()->exists()) {
                $product->variants()->delete();
                $this->refreshProductPrice($product);
            }
            return;
        }

        $hasDefault = false;
        foreach ($prepared as $item) {
            if (!empty($item['is_default'])) {
                $hasDefault = true;
                break;
            }
        }
        if (!$hasDefault) {
            $prepared[0]['is_default'] = true;
        }

        $existing = $product->variants()->get()->keyBy('id');
        $keepIds = [];
        $usedSkus = $existing->pluck('sku')->filter()->values()->all();

        foreach ($prepared as $item) {
            $payload = [
                'name'        => $item['name'],
                'price'       => $item['price'],
                'price_sale'  => ($item['price_sale'] > 0 && $item['price_sale'] < $item['price']) ? $item['price_sale'] : 0,
                'stock'       => $item['stock'],
                'status'      => $item['status'],
                'is_default'  => $item['is_default'] ? 1 : 0,
                'weight_gram' => $item['weight_gram'],
                'sort_order'  => $item['sort_order'],
            ];

            $existingVariant = null;
            if (!empty($item['id']) && $existing->has($item['id'])) {
                $existingVariant = $existing[$item['id']];
            }

            $sku = $item['sku'];
            if ($existingVariant) {
                if ($sku === '') {
                    $sku = $existingVariant->sku ?: $this->generateVariantSku($product, $usedSkus);
                } elseif ($sku !== $existingVariant->sku) {
                    if (ProductVariant::where('sku', $sku)->where('id', '!=', $existingVariant->id)->exists()) {
                        $sku = $this->generateVariantSku($product, $usedSkus);
                    }
                }
            } else {
                if ($sku === '' || ProductVariant::where('sku', $sku)->exists()) {
                    $sku = $this->generateVariantSku($product, $usedSkus);
                } else {
                    $usedSkus[] = $sku;
                }
            }

            $payload['sku'] = $sku;

            if ($existingVariant) {
                $existingVariant->fill($payload)->save();
                $keepIds[] = $existingVariant->id;
            } else {
                $payload['product_id'] = $product->id;
                $model = ProductVariant::create($payload);
                $keepIds[] = $model->id;
            }
        }

        $product->variants()->whereNotIn('id', $keepIds)->delete();
        $this->refreshProductPrice($product);
        $product->load('variants');
    }

    /** Danh sách sản phẩm với filter + sort */
    public function index(Request $request)
    {
        $q         = trim((string)$request->query('q', ''));
        $catSlug   = $request->query('category_slug');
        $pmin      = (float)$request->query('pmin', 0);
        $pmax      = (float)$request->query('pmax', 0);
        $sort      = $request->query('sort', 'created_desc');
        $perPage   = max(1, (int)$request->query('per_page', 24));
        $types     = $request->query('types', []);
        $weights   = $request->query('weights', []);
        $statusArg = $request->query('status', null); // cho phép FE lọc status

        // Filter meta trong content (JSON)
        $channel   = $request->query('channel');     // pickup|delivery
        $tag       = $request->query('tag');         // text khớp meta.tags
        $sku       = $request->query('sku');         // text khớp meta.sku
        $vegan     = $request->query('vegan', null); // "0"|"1"

        $query = Product::query()->with([
            'category:id,name,slug,image,parent_id,description,status', // ✅ Load đầy đủ thông tin category
        ]);

        // Ưu tiên filter theo status nếu FE truyền; public (không auth, không admin) chỉ lấy status=1
        if ($statusArg !== null && $statusArg !== '') {
            $query->where('status', (int)$statusArg);
        } elseif (!$request->has('admin') && !auth()->check()) {
            $query->where('status', 1);
        }

        if ($q !== '') {
            $query->where(function ($x) use ($q) {
                $x->where('name', 'like', "%{$q}%")
                  ->orWhere('slug', 'like', "%{$q}%")
                  ->orWhere('description', 'like', "%{$q}%")
                  ->orWhere('content', 'like', "%{$q}%");
            });
        }

        if ($catSlug) {
            $cat = Category::where('slug', $catSlug)->first();
            if ($cat) {
                $query->where('category_id', $cat->id);
            } else {
                return response()->json(['data' => [], 'total' => 0, 'last_page' => 1]);
            }
        }

        if ($pmin > 0) $query->where('price_buy', '>=', $pmin);
        if ($pmax > 0) $query->where('price_buy', '<=', $pmax);

        if (!empty($types))   $query->whereIn('type',   (array)$types);
        if (!empty($weights)) $query->whereIn('weight', (array)$weights);

        // ====== Filter theo meta trong JSON content (MySQL/MariaDB) ======
        if ($channel) {
            $query->whereRaw(
                "JSON_CONTAINS(JSON_EXTRACT(CAST(`content` AS JSON), '$.meta.channels'), json_quote(?))",
                [$channel]
            );
        }
        if ($sku) {
            $query->whereRaw(
                "JSON_EXTRACT(CAST(`content` AS JSON), '$.meta.sku') = ?",
                [$sku]
            );
        }
        if ($tag) {
            $query->whereRaw(
                "JSON_SEARCH(JSON_EXTRACT(CAST(`content` AS JSON), '$.meta.tags'), 'one', ?) IS NOT NULL",
                [$tag]
            );
        }
        if ($vegan !== null && $vegan !== '') {
            $query->whereRaw(
                "JSON_EXTRACT(CAST(`content` AS JSON), '$.meta.nutrition.vegan') = ?",
                [(int)!!$vegan]
            );
        }

        // Sort
        switch ($sort) {
            case 'name_asc':       $query->orderBy('name', 'asc'); break;
            case 'name_desc':      $query->orderBy('name', 'desc'); break;
            case 'price_asc':      $query->orderBy('price_buy', 'asc'); break;
            case 'price_desc':     $query->orderBy('price_buy', 'desc'); break;
            case 'discount_desc':  
                // Sắp xếp theo discount - sẽ sắp xếp sau khi transform dựa vào discount_value
                $query->orderBy('price_buy', 'desc');
                break;
            case 'created_asc':    $query->orderBy('created_at', 'asc'); break;
            default:               $query->orderBy('created_at', 'desc');
        }

        $products = $query->paginate($perPage);

        // Gắn thêm image_url + meta alias + available_quantity
        $products->getCollection()->transform(function ($p) {
            $p->image_url = $p->thumbnail ?: $p->image;
            [$html, $meta] = $this->unpackContent($p);
            $p->content_html     = $html;
            $p->meta             = $meta;
            $p->sku              = $meta['sku'] ?? null;
            $p->channels         = $meta['channels'] ?? [];
            $p->tags             = $meta['tags'] ?? [];
            $p->nutrition        = $meta['nutrition'] ?? [];
            $p->available_from   = $meta['availableFrom'] ?? null;
            $p->best_before_days = $meta['bestBeforeDays'] ?? null;
            $p->weight_gram      = $meta['weightGram'] ?? null;
            $p->price            = $p->effective_price; // Add price field for frontend compatibility

            // ✅ THÊM available_quantity từ product_store
            $p->available_quantity = $p->getAvailableQuantity();
            $p->is_in_stock = $p->isInStock();

            // ✅ Thêm image_url cho category nếu có
            if ($p->category) {
                $p->category->image_url = $p->category->image_url;
            }

            return $p;
        });

        return response()->json($products);
    }

    /** Tạo sản phẩm (sale giữ nguyên), field mới pack vào content.meta */
    public function store(Request $r)
    {
        try {
            $data = $r->validate([
                'name'            => 'required|string|max:191',
                'slug'            => 'nullable|string|max:191',
                'category_id'     => 'required|integer|exists:category,id',

                // Giá sản phẩm
                'price_buy'       => 'nullable|numeric|min:0',

                'quantity'        => 'nullable|numeric|min:0',
                'unit'            => 'nullable|string|max:50',
                'type'            => 'nullable|string|max:100',
                'weight'          => 'nullable|string|max:50',
                'product_new'     => 'nullable|boolean',
                'status'          => 'nullable|boolean',

                // Ảnh
                'thumbnail_file'  => 'nullable|image',
                'image_file'      => 'nullable|image',
                'gallery_files.*' => 'nullable|image',

                // Rich text & meta mở rộng
                'description'     => 'nullable|string',
                'content'         => 'nullable|string',  // html chi tiết

                // UI fields (chỉ lưu vào meta)
                'sku'             => 'nullable|string|max:100',
                'availableFrom'   => 'nullable|date',
                'bestBeforeDays'  => 'nullable|integer|min:0',
                'flavors'         => 'nullable|array',
                'flavors.*'       => 'string|max:100',
                'ingredients'     => 'nullable|array',
                'ingredients.*'   => 'string|max:100',
                'channels'        => 'nullable|array',
                'channels.*'      => 'in:pickup,delivery',
                'nutrition'       => 'nullable|array',
                'nutrition.vegan' => 'nullable|boolean',
                'nutrition.glutenFree' => 'nullable|boolean',
                'nutrition.containsNuts' => 'nullable|boolean',
                'nutrition.containsDairy' => 'nullable|boolean',
                'tags'            => 'nullable|array',
                'tags.*'          => 'string|max:50',
                'weightGram'      => 'nullable|integer|min:0',

                // Variants
                'variants'                 => 'nullable|array|max:20',
                'variants.*.id'            => 'nullable|integer',
                'variants.*.name'          => 'required_with:variants|string|max:191',
                'variants.*.sku'           => 'nullable|string|max:191',
                'variants.*.price'         => 'required_with:variants|numeric|min:0',
                'variants.*.price_sale'    => 'nullable|numeric|min:0',
                'variants.*.stock'         => 'nullable|integer|min:0',
                'variants.*.status'        => 'nullable|boolean',
                'variants.*.is_default'    => 'nullable|boolean',
                'variants.*.weight_gram'   => 'nullable|integer|min:0',
                'variants.*.sort_order'    => 'nullable|integer|min:0',
            ]);

            // Tạo slug tự động nếu chưa có
            if (empty($data['slug']) && !empty($data['name'])) {
                $base = Str::slug($data['name']);
                $slug = $base;
                $i = 1;
                while (Product::where('slug', $slug)->exists()) {
                    $slug = $base . '-' . $i++;
                }
                $data['slug'] = $slug;
            }

            // Set mặc định giá nếu không có
            if (empty($data['price_buy'])) $data['price_buy'] = 0;

            $dir = 'products/' . now()->format('Ym');

            if ($r->hasFile('thumbnail_file')) {
                $path = $r->file('thumbnail_file')->storePublicly($dir, 'public');
                $data['thumbnail'] = 'storage/' . $path;
            }
            if ($r->hasFile('image_file')) {
                $path = $r->file('image_file')->storePublicly($dir, 'public');
                $data['image'] = 'storage/' . $path;
            }

            $variantsData = $data['variants'] ?? [];

            // Pack content + meta
            $meta = [
                'sku'             => $data['sku']            ?? null,
                'availableFrom'   => $data['availableFrom']  ?? null,
                'bestBeforeDays'  => $data['bestBeforeDays'] ?? null,
                'flavors'         => $data['flavors']        ?? [],
                'ingredients'     => $data['ingredients']    ?? [],
                'channels'        => $data['channels']       ?? [],
                'nutrition'       => $data['nutrition']      ?? [],
                'tags'            => $data['tags']           ?? [],
                'weightGram'      => $data['weightGram']     ?? null,
            ];
            $html = $data['content'] ?? '';
            $data['content'] = $this->packContent($html, $meta);

            $data['created_by'] = auth()->id() ?? 1;
            $data['created_at'] = now();

            // Loại các key chỉ dùng cho meta để tránh fillable
            foreach (['sku','availableFrom','bestBeforeDays','flavors','ingredients','channels','nutrition','tags','weightGram'] as $k) {
                unset($data[$k]);
            }

            unset($data['variants']);

            $product = Product::create($data);

            if (!empty($variantsData)) {
                $this->syncVariants($product, $variantsData);
            }

            if ($r->hasFile('gallery_files')) {
                foreach ($r->file('gallery_files') as $file) {
                    $path = $file->storePublicly($dir, 'public');
                    ProductImage::create([
                        'product_id' => $product->id,
                        'image'      => 'storage/' . $path,
                        'created_by' => auth()->id() ?? 1,
                        'status'     => 1,
                    ]);
                }
            }

            // Trả về kèm meta
            [$htmlOut, $metaOut] = $this->unpackContent($product);
            $product->content_html = $htmlOut;
            $product->meta         = $metaOut;
            $product->load('variants');

            return response()->json(['message' => 'Thêm sản phẩm thành công', 'data' => $product]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Có lỗi xảy ra: ' . $e->getMessage()], 500);
        }
    }

    /** Cập nhật sản phẩm (merge meta trong content) */
    public function update(Request $r, $id)
    {
        $p = Product::findOrFail($id);

        $rules = [
            'name'            => 'sometimes|required|string|max:255',
            'slug'            => 'nullable|string|max:255|unique:product,slug,' . $p->id,
            'category_id'     => 'nullable|integer|exists:category,id',
            'description'     => 'nullable|string',
            'content'         => 'nullable|string',
            'price_buy'       => 'nullable|numeric|min:0',
            'weight'          => 'nullable|string|max:50',
            'type'            => 'nullable|string|max:50',
            'quantity'        => 'nullable|numeric|min:0',
            'unit'            => 'nullable|string|max:50',
            'product_new'     => 'nullable|boolean',
            'status'          => 'nullable|integer|in:0,1',
            'thumbnail_file'  => 'nullable|image',
            'image_file'      => 'nullable|image',
            'gallery_files.*' => 'nullable|image',

            // meta mới
            'sku'             => 'nullable|string|max:100',
            'availableFrom'   => 'nullable|date',
            'bestBeforeDays'  => 'nullable|integer|min:0',
            'flavors'         => 'nullable|array',
            'flavors.*'       => 'string|max:100',
            'ingredients'     => 'nullable|array',
            'ingredients.*'   => 'string|max:100',
            'channels'        => 'nullable|array',
            'channels.*'      => 'in:pickup,delivery',
            'nutrition'       => 'nullable|array',
            'tags'            => 'nullable|array',
            'tags.*'          => 'string|max:50',
            'weightGram'      => 'nullable|integer|min:0',

            // Variants
            'variants'                 => 'nullable|array|max:20',
            'variants.*.id'            => 'nullable|integer',
            'variants.*.name'          => 'required_with:variants|string|max:191',
            'variants.*.sku'           => 'nullable|string|max:191',
            'variants.*.price'         => 'required_with:variants|numeric|min:0',
            'variants.*.price_sale'    => 'nullable|numeric|min:0',
            'variants.*.stock'         => 'nullable|integer|min:0',
            'variants.*.status'        => 'nullable|boolean',
            'variants.*.is_default'    => 'nullable|boolean',
            'variants.*.weight_gram'   => 'nullable|integer|min:0',
            'variants.*.sort_order'    => 'nullable|integer|min:0',
        ];

        $data = $r->validate($rules);

        // Tạo slug tự động nếu cần
        if (isset($data['name']) && empty($data['slug'])) {
            $base = Str::slug($data['name']);
            $slug = $base ?: ($p->slug ?: Str::random(8));
            $i = 1;
            while (Product::where('slug', $slug)->where('id', '!=', $p->id)->exists()) {
                $slug = $base . '-' . $i++;
            }
            $data['slug'] = $slug;
        }

        $dir = 'products/' . now()->format('Ym');

        if ($r->hasFile('thumbnail_file')) {
            $path = $r->file('thumbnail_file')->storePublicly($dir, 'public');
            $data['thumbnail'] = 'storage/' . $path;
        }
        if ($r->hasFile('image_file')) {
            $path = $r->file('image_file')->storePublicly($dir, 'public');
            $data['image'] = 'storage/' . $path;
        }

        $variantsData = $data['variants'] ?? null;

        // Merge meta cũ + mới
        [$oldHtml, $oldMeta] = $this->unpackContent($p);
        $newMeta = array_filter([
            'sku'             => $data['sku']            ?? null,
            'availableFrom'   => $data['availableFrom']  ?? null,
            'bestBeforeDays'  => $data['bestBeforeDays'] ?? null,
            'flavors'         => $data['flavors']        ?? null,
            'ingredients'     => $data['ingredients']    ?? null,
            'channels'        => $data['channels']       ?? null,
            'nutrition'       => $data['nutrition']      ?? null,
            'tags'            => $data['tags']           ?? null,
            'weightGram'      => $data['weightGram']     ?? null,
        ], fn($v) => $v !== null);

        $html = $data['content'] ?? $oldHtml;
        $data['content'] = $this->packContent($html, array_replace($oldMeta, $newMeta));

        $data['updated_at'] = now();
        $data['updated_by'] = auth()->id() ?? 1;

        // Dọn key meta trước khi fill
        foreach (['sku','availableFrom','bestBeforeDays','flavors','ingredients','channels','nutrition','tags','weightGram'] as $k) {
            unset($data[$k]);
        }

        unset($data['variants']);

        $p->fill($data)->save();

        if ($r->hasFile('gallery_files')) {
            foreach ($r->file('gallery_files') as $file) {
                $path = $file->storePublicly($dir, 'public');
                $p->images()->create([
                    'image'      => 'storage/' . $path,
                    'created_at' => now(),
                    'status'     => 1,
                ]);
            }
        }

        if ($variantsData !== null) {
            $this->syncVariants($p, $variantsData);
        } else {
            $p->loadMissing('variants');
        }

        [$htmlOut, $metaOut] = $this->unpackContent($p->fresh());
        $p->content_html = $htmlOut;
        $p->meta         = $metaOut;
        $p->load('variants');

        return response()->json($p);
    }

    /** Lấy chi tiết sản phẩm (cho admin hoặc FE) */
    public function show($id)
    {
        $q = Product::query()->with([
            'category:id,name,slug,image,parent_id,description,status',
            'images:id,product_id,image',
            'variants' => fn ($query) => $query->orderByDesc('is_default')->orderBy('sort_order')->orderBy('id'),
            'attributes' => fn ($query) => $query->with('attribute:id,name'),
        ]);
        $item = is_numeric($id)
            ? $q->where('id', (int)$id)->first()
            : $q->where('slug', $id)->first();

        if (!$item) return response()->json(['message' => 'Not found'], 404);

        [$html, $meta] = $this->unpackContent($item);
        $item->content_html     = $html;
        $item->meta             = $meta;
        $item->sku              = $meta['sku'] ?? null;
        $item->channels         = $meta['channels'] ?? [];
        $item->tags             = $meta['tags'] ?? [];
        $item->nutrition        = $meta['nutrition'] ?? [];
        $item->available_from   = $meta['availableFrom'] ?? null;
        $item->best_before_days = $meta['bestBeforeDays'] ?? null;
        $item->weight_gram      = $meta['weightGram'] ?? null;
        $item->price            = $item->effective_price;
        
        $item->available_quantity = $item->getAvailableQuantity();
        $item->is_in_stock = $item->isInStock();
        
        if ($item->category) {
            $item->category->image_url = $item->category->image_url;
        }

        return response()->json($item);
    }

    /** Lấy sản phẩm mới */
    public function product_new(Request $request)
    {
        $limit = $request->query('limit') ?? 12;

        $productStore = ProductStore::query()
            ->select('product_id', DB::raw('SUM(qty) as total_qty'))
            ->groupBy('product_id');

        $products = Product::query()
            ->where('status', 1)
            ->where('product_new', 1)
            ->leftJoinSub($productStore, 'ps', fn($j) => $j->on('ps.product_id', '=', 'product.id'))
            ->select(
                'product.id',
                'product.name',
                'product.slug',
                'product.thumbnail',
                'product.image',
                'product.price_buy',
                DB::raw('COALESCE(ps.total_qty, 0) as total_qty')
            )
            ->orderBy('product.created_at', 'desc')
            ->limit($limit)
            ->get();

        $products->transform(function ($p) {
            $p->image_url = $p->thumbnail ?: $p->image;
            $p->price = (float)$p->price_buy;
            return $p;
        });

        return response()->json($products);
    }

    /** Facets cho filter */
    public function facets(Request $request)
    {
        $q       = trim((string)$request->query('q', ''));
        $catSlug = $request->query('category_slug');
        $pmin    = (float)$request->query('pmin', 0);
        $pmax    = (float)$request->query('pmax', 0);

        $base = Product::query()->where('status', 1);

        if ($q !== '') {
            $base->where(function ($x) use ($q) {
                $x->where('name', 'like', "%$q%")
                  ->orWhere('slug', 'like', "%$q%")
                  ->orWhere('description', 'like', "%$q%")
                  ->orWhere('content', 'like', "%$q%");
            });
        }

        if ($catSlug) {
            $cat = Category::where('slug', $catSlug)->first();
            if ($cat) $base->where('category_id', $cat->id);
        }

        if ($pmin > 0) $base->where('price_buy', '>=', $pmin);
        if ($pmax > 0) $base->where('price_buy', '<=', $pmax);

        $types   = (clone $base)->whereNotNull('type')->groupBy('type')->pluck('type')->values();
        $weights = (clone $base)->whereNotNull('weight')->groupBy('weight')->pluck('weight')->values();

        return response()->json(['types' => $types, 'weights' => $weights]);
    }

    /** Lấy chi tiết theo slug */
    public function showBySlug(string $slug)
    {
        $item = Product::with([
            'category:id,name,slug,image,parent_id,description,status',
            'images:id,product_id,image',
            'variants' => fn ($query) => $query->orderByDesc('is_default')->orderBy('sort_order')->orderBy('id'),
            'attributes' => fn ($query) => $query->with('attribute:id,name'),
        ])
            ->where('slug', $slug)->first();
        if (!$item) return response()->json(['message' => 'Not found'], 404);

        [$html, $meta] = $this->unpackContent($item);
        $item->content_html = $html;
        $item->meta = $meta;
        $item->price = $item->effective_price;
        
        $item->available_quantity = $item->getAvailableQuantity();
        $item->is_in_stock = $item->isInStock();
        
        if ($item->category) {
            $item->category->image_url = $item->category->image_url;
        }

        return response()->json($item);
    }

    /* =========================================================
     | THÙNG RÁC (status-based)
     * ========================================================= */

    /** GET /api/v1/products/trash — danh sách đang ẩn (status=0) */
    public function trash(Request $request)
    {
        $q       = trim((string)$request->query('q', ''));
        $catSlug = $request->query('category_slug');
        $perPage = max(1, (int)$request->query('per_page', 24));
        $sort    = $request->query('sort', 'created_desc');

        $query = Product::query()->with('category')->where('status', 0);

        if ($q !== '') {
            $query->where(function ($x) use ($q) {
                $x->where('name', 'like', "%{$q}%")
                  ->orWhere('slug', 'like', "%{$q}%")
                  ->orWhere('description', 'like', "%{$q}%")
                  ->orWhere('content', 'like', "%{$q}%");
            });
        }

        if ($catSlug) {
            $cat = Category::where('slug', $catSlug)->first();
            if ($cat) {
                $query->where('category_id', $cat->id);
            } else {
                return response()->json([
                    'data' => [], 'total' => 0, 'last_page' => 1, 'current_page' => 1, 'per_page' => $perPage,
                ]);
            }
        }

        switch ($sort) {
            case 'name_asc':       $query->orderBy('name', 'asc'); break;
            case 'name_desc':      $query->orderBy('name', 'desc'); break;
            case 'price_asc':      $query->orderBy('price_buy', 'asc'); break;
            case 'price_desc':     $query->orderBy('price_buy', 'desc'); break;
            case 'discount_desc':  $query->orderBy('price_buy', 'desc'); break;
            case 'created_asc':    $query->orderBy('created_at', 'asc'); break;
            default:               $query->orderBy('created_at', 'desc');
        }

        $rows = $query->paginate($perPage);

        $rows->getCollection()->transform(function ($product) {
            $product->image_url = $product->thumbnail ?: $product->image;
            $product->price = $product->effective_price; // Add price field for frontend compatibility
            return $product;
        });

        return response()->json([
            'data'         => $rows->items(),
            'total'        => $rows->total(),
            'last_page'    => $rows->lastPage(),
            'current_page' => $rows->currentPage(),
            'per_page'     => $rows->perPage(),
        ]);
    }

    /** DELETE /api/v1/products/{id} — Đưa vào thùng rác (status=0) */
    public function destroy($id)
    {
        $p = Product::findOrFail($id);
        $p->status     = 0;
        $p->updated_at = now();
        $p->updated_by = auth()->id() ?? 1;
        $p->save();

        return response()->json(['message' => 'Hidden']);
    }

    /** POST /api/v1/products/{id}/restore — khôi phục từ thùng rác */
    public function restore(int $id)
    {
        $p = Product::findOrFail($id);
        $p->status     = 1;
        $p->updated_at = now();
        $p->updated_by = auth()->id() ?? 1;
        $p->save();

        return response()->json(['message' => 'Restored']);
    }

    /** POST /api/v1/products/restore  body: { ids: [] } */
    public function bulkRestore(Request $r)
    {
        $ids = (array)$r->input('ids', []);
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return response()->json(['message' => 'No IDs'], 422);

        Product::whereIn('id', $ids)->update([
            'status'     => 1,
            'updated_at' => now(),
            'updated_by' => auth()->id() ?? 1,
        ]);

        return response()->json(['message' => 'Restored', 'count' => count($ids)]);
    }

    /** DELETE /api/v1/products/{id}/purge — xoá vĩnh viễn */
    public function purge(int $id)
    {
        DB::transaction(function () use ($id) {
            ProductImage::where('product_id', $id)->delete();
            ProductStore::where('product_id', $id)->delete();
            Product::where('id', $id)->delete();
        });

        return response()->json(['message' => 'Purged']);
    }

    /** DELETE /api/v1/products/purge  body: { ids: [] } */
    public function bulkPurge(Request $r)
    {
        $ids = (array)$r->input('ids', []);
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return response()->json(['message' => 'No IDs'], 422);

        DB::transaction(function () use ($ids) {
            ProductImage::whereIn('product_id', $ids)->delete();
            ProductStore::whereIn('product_id', $ids)->delete();
            Product::whereIn('id', $ids)->delete();
        });

        return response()->json(['message' => 'Purged', 'count' => count($ids)]);
    }

    /**
     * POST /api/v1/products/check-stock
     * Kiểm tra tồn kho trước khi đặt hàng
     */
    public function checkStock(Request $request)
    {
        $items = $request->input('items', []);
        
        if (!is_array($items) || empty($items)) {
            return response()->json(['message' => 'Items array is required'], 422);
        }

        $unavailable = [];
        $stockData = [];

        foreach ($items as $item) {
            $productId = (int)($item['product_id'] ?? $item['id'] ?? 0);
            $qty = (int)($item['qty'] ?? $item['quantity'] ?? 1);

            if ($productId <= 0) {
                continue;
            }

            $product = Product::find($productId);
            if (!$product) {
                $unavailable[] = [
                    'product_id' => $productId,
                    'name' => "SP #{$productId}",
                    'available' => 0,
                    'requested' => $qty,
                ];
                continue;
            }

            $available = $product->getAvailableQuantity();
            $stockData[] = [
                'product_id' => $productId,
                'name' => $product->name,
                'available' => $available,
                'requested' => $qty,
            ];

            if ($available < $qty) {
                $unavailable[] = [
                    'product_id' => $productId,
                    'name' => $product->name,
                    'available' => $available,
                    'requested' => $qty,
                ];
            }
        }

        return response()->json([
            'available' => empty($unavailable),
            'unavailable' => $unavailable,
            'stock_data' => $stockData,
        ]);
    }
}

