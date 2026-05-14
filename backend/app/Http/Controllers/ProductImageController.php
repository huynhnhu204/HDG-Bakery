<?php

namespace App\Http\Controllers;

use App\Models\ProductImage;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ProductImageController extends Controller
{
    /**
     * GET /api/v1/product-images?product_id=&status=&per_page=20
     * Lấy danh sách ảnh của sản phẩm
     */
    public function index(Request $request)
    {
        $pid = $request->query('product_id');
        $per = max(1, min(100, (int)$request->query('per_page', 20)));
        $stt = $request->query('status');
        $admin = $request->query('admin', false); // Admin xem tất cả, FE chỉ xem status=1

        $q = ProductImage::query()
            ->when($pid, fn($qb) => $qb->where('product_id', (int)$pid));
        
        // TẠM THỜI: Comment các cột chưa có trong database
        // Sau khi chạy SQL script, bỏ comment lại
        // ->when($stt !== null, fn($qb) => $qb->where('status', (int)$stt))
        // ->when(!$admin, fn($qb) => $qb->where('status', 1))
        // ->orderBy('is_primary', 'desc')
        // ->orderBy('sort', 'asc')
        
        $q->orderBy('id', 'asc');

        $items = $q->paginate($per);
        
        // Thêm image_url cho mỗi ảnh
        $items->getCollection()->transform(function ($img) {
            $img->image_url = $img->image_url;
            return $img;
        });

        return response()->json($items);
    }

    /**
     * GET /api/v1/product-images/{id}
     */
    public function show(int $id)
    {
        $item = ProductImage::findOrFail($id);
        $item->image_url = $item->image_url;
        return response()->json($item);
    }

    /**
     * POST /api/v1/product-images
     * Thêm ảnh (upload nhiều file hoặc nhiều URL)
     * Body: { product_id, images: [file...], image_urls: ["url1", "url2"], alt, title, sort }
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:product,id',
            'image_files.*' => 'nullable|image|mimes:jpeg,jpg,png,webp|max:10240', // 10MB
            'image_urls.*' => 'nullable|url|max:500',
            'alt' => 'nullable|string|max:255',
            'title' => 'nullable|string|max:255',
            'sort' => 'nullable|integer|min:0',
            'status' => 'nullable|integer|in:0,1',
        ]);

        $productId = (int)$data['product_id'];
        $product = Product::findOrFail($productId);

        // Kiểm tra xem sản phẩm đã có ảnh đại diện chưa
        $hasPrimary = ProductImage::where('product_id', $productId)
            ->where('is_primary', 1)
            ->exists();

        // Lấy sort max nếu không truyền
        $maxSort = ProductImage::where('product_id', $productId)->max('sort') ?? -1;
        $nextSort = $data['sort'] ?? ($maxSort + 1);

        $images = [];
        $userId = auth()->id() ?? 1;
        $dir = 'products/' . now()->format('Ym');

        // Upload files
        if ($request->hasFile('image_files')) {
            foreach ($request->file('image_files') as $file) {
                $path = $file->storePublicly($dir, 'public');
                
                $imgData = [
                    'product_id' => $productId,
                    'image' => 'storage/' . $path,
                    'alt' => $data['alt'] ?? null,
                    'title' => $data['title'] ?? null,
                    'sort' => $nextSort++,
                    'status' => $data['status'] ?? 1,
                    'is_primary' => !$hasPrimary ? 1 : 0, // Ảnh đầu tiên làm đại diện nếu chưa có
                    'created_by' => $userId,
                    'created_at' => now(),
                ];

                $img = ProductImage::create($imgData);
                $img->image_url = $img->image_url;
                $images[] = $img;

                // Đánh dấu đã có primary
                if (!$hasPrimary) {
                    $hasPrimary = true;
                }
            }
        }

        // Thêm URLs
        if (!empty($data['image_urls'])) {
            foreach ($data['image_urls'] as $url) {
                // Validate URL chỉ nhận https
                if (!str_starts_with($url, 'https://')) {
                    continue; // Bỏ qua URL không hợp lệ
                }

                $imgData = [
                    'product_id' => $productId,
                    'image' => $url,
                    'alt' => $data['alt'] ?? null,
                    'title' => $data['title'] ?? null,
                    'sort' => $nextSort++,
                    'status' => $data['status'] ?? 1,
                    'is_primary' => !$hasPrimary ? 1 : 0,
                    'created_by' => $userId,
                    'created_at' => now(),
                ];

                $img = ProductImage::create($imgData);
                $img->image_url = $img->image_url;
                $images[] = $img;

                if (!$hasPrimary) {
                    $hasPrimary = true;
                }
            }
        }

        if (empty($images)) {
            return response()->json(['message' => 'Không có ảnh nào được thêm'], 422);
        }

        return response()->json([
            'message' => 'Thêm ảnh thành công',
            'data' => $images,
            'count' => count($images)
        ], 201);
    }

    /**
     * PATCH /api/v1/product-images/{id}
     * Cập nhật thông tin ảnh
     */
    public function update(Request $request, int $id)
    {
        $item = ProductImage::findOrFail($id);
        $hasFile = $request->hasFile('image_file');

        $data = $request->validate([
            'alt' => 'sometimes|nullable|string|max:255',
            'title' => 'sometimes|nullable|string|max:255',
            'status' => 'sometimes|integer|in:0,1',
            'image_file' => 'nullable|image|mimes:jpeg,jpg,png,webp|max:10240',
            'image' => [$hasFile ? 'nullable' : 'sometimes', 'string', 'max:500'],
        ]);

        // Nếu thay ảnh bằng file
        if ($hasFile) {
            $dir = 'products/' . now()->format('Ym');
            $path = $request->file('image_file')->storePublicly($dir, 'public');
            $data['image'] = 'storage/' . $path;
        }

        // Nếu thay bằng URL, validate https
        if (isset($data['image']) && str_starts_with($data['image'], 'http') && !str_starts_with($data['image'], 'https://')) {
            return response()->json(['message' => 'URL phải là https'], 422);
        }

        $data['updated_at'] = now();
        $data['updated_by'] = auth()->id() ?? 1;

        $item->fill($data)->save();
        $item->image_url = $item->image_url;

        return response()->json($item);
    }

    /**
     * POST /api/v1/product-images/{id}/set-primary
     * Đặt ảnh làm đại diện
     */
    public function setPrimary(int $id)
    {
        $image = ProductImage::findOrFail($id);
        
        DB::transaction(function () use ($image) {
            // Bỏ cờ đại diện của các ảnh khác cùng sản phẩm
            ProductImage::where('product_id', $image->product_id)
                ->where('id', '!=', $image->id)
                ->update(['is_primary' => 0, 'updated_at' => now(), 'updated_by' => auth()->id() ?? 1]);

            // Đặt ảnh này làm đại diện
            $image->is_primary = 1;
            $image->updated_at = now();
            $image->updated_by = auth()->id() ?? 1;
            $image->save();
        });

        $image->image_url = $image->image_url;
        return response()->json(['message' => 'Đã đặt ảnh đại diện', 'data' => $image]);
    }

    /**
     * POST /api/v1/product-images/sort
     * Cập nhật thứ tự hàng loạt
     * Body: { items: [{ id, sort }, ...] }
     */
    public function updateSort(Request $request)
    {
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer|exists:product_image,id',
            'items.*.sort' => 'required|integer|min:0',
        ]);

        $userId = auth()->id() ?? 1;
        $now = now();

        foreach ($data['items'] as $item) {
            ProductImage::where('id', $item['id'])->update([
                'sort' => $item['sort'],
                'updated_at' => $now,
                'updated_by' => $userId,
            ]);
        }

        return response()->json(['message' => 'Cập nhật thứ tự thành công']);
    }

    /**
     * POST /api/v1/product-images/{id}/toggle-status
     * Ẩn/hiện ảnh
     */
    public function toggleStatus(int $id)
    {
        $image = ProductImage::findOrFail($id);
        $image->status = $image->status === 1 ? 0 : 1;
        $image->updated_at = now();
        $image->updated_by = auth()->id() ?? 1;
        $image->save();

        $image->image_url = $image->image_url;
        return response()->json([
            'message' => $image->status === 1 ? 'Hiển thị ảnh' : 'Ẩn ảnh',
            'data' => $image
        ]);
    }

    /**
     * DELETE /api/v1/product-images/{id}
     * Xóa (tạm thời xóa vĩnh viễn vì chưa có soft delete)
     */
    public function destroy(int $id)
    {
        $image = ProductImage::findOrFail($id);
        $isPrimary = $image->is_primary;
        $productId = $image->product_id;

        // Tạm thời xóa vĩnh viễn vì chưa có soft delete
        // Sau khi có cột deleted_at, đổi thành: $image->delete(); (soft delete)
        $image->forceDelete();

        // Nếu ảnh bị xóa là đại diện, tự động chọn ảnh khác làm đại diện
        if ($isPrimary) {
            $nextPrimary = ProductImage::where('product_id', $productId)
                ->where('id', '!=', $id)
                ->where('status', 1)
                ->orderBy('sort', 'asc')
                ->orderBy('id', 'asc')
                ->first();

            if ($nextPrimary) {
                $nextPrimary->is_primary = 1;
                $nextPrimary->updated_at = now();
                $nextPrimary->updated_by = auth()->id() ?? 1;
                $nextPrimary->save();
            }
        }

        return response()->json(['message' => 'Đã xóa ảnh']);
    }

    /**
     * POST /api/v1/product-images/{id}/restore
     * Khôi phục ảnh đã xóa (chỉ hoạt động khi có soft delete)
     */
    public function restore(int $id)
    {
        // Tạm thời không hoạt động vì chưa có soft delete
        // Sau khi có cột deleted_at và bật SoftDeletes, bỏ comment lại:
        // $image = ProductImage::withTrashed()->findOrFail($id);
        // $image->restore();
        // $image->image_url = $image->image_url;
        // return response()->json(['message' => 'Đã khôi phục ảnh', 'data' => $image]);
        
        return response()->json(['message' => 'Chức năng khôi phục chưa khả dụng (chưa có soft delete)'], 501);
    }

    /**
     * DELETE /api/v1/product-images/{id}/purge
     * Xóa vĩnh viễn (hiện tại đang xóa vĩnh viễn luôn)
     */
    public function purge(int $id)
    {
        $image = ProductImage::findOrFail($id);
        
        // TODO: Xóa file vật lý nếu cần
        // if (str_starts_with($image->image, 'storage/')) {
        //     Storage::disk('public')->delete($image->image);
        // }

        $image->forceDelete();
        return response()->json(['message' => 'Đã xóa vĩnh viễn']);
    }
}
