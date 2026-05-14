<?php

namespace App\Http\Controllers;

use App\Models\ProductSale;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class ProductSaleController extends Controller
{
    // GET /api/v1/product-sale?product_id=&active=&per_page=&q=&status=&page=
    public function index(Request $request)
    {
        $pid    = $request->query('product_id');
        $active = $request->query('active'); // Lấy string, không dùng boolean()
        $q      = $request->query('q', '');
        $status = $request->query('status');
        $per    = (int)$request->query('per_page', 20);
        $page   = (int)$request->query('page', 1);
        $now    = Carbon::now();

        $query = ProductSale::query()
            ->with([
                'product:id,name,price_buy,category_id,thumbnail,image',
                'product.category:id,name,slug'
            ])
            ->when($pid, fn($qb) => $qb->where('product_id', (int)$pid))
            ->when($q !== '', function($qb) use ($q) {
                $qb->where(function($x) use ($q) {
                    $x->where('name', 'like', "%{$q}%")
                      ->orWhereHas('product', function($prod) use ($q) {
                          $prod->where('name', 'like', "%{$q}%");
                      });
                });
            })
            ->when($status !== null && $status !== 'all', fn($qb) => $qb->where('status', (int)$status))
            ->when($active === 'true', function($qb) use ($now) {
                $qb->where('status',1)
                   ->where('date_begin','<=',$now)
                   ->where('date_end','>=',$now);
            })
            ->when($active === 'false', function($qb) use ($now) {
                $qb->where(function($x) use ($now){
                    $x->where('date_end','<',$now)
                      ->orWhere('status','!=',1);
                });
            })
            ->orderByDesc('created_at')
            ->orderByDesc('date_begin');

        $paginated = $query->paginate(max(1,$per), ['*'], 'page', $page);

        // Fallback cho dữ liệu demo/seed cũ: nếu active=true mà không có bản ghi theo thời gian,
        // trả về danh sách sale status=1 gần nhất để trang chủ vẫn có dữ liệu hiển thị.
        if ($active === 'true' && $paginated->total() === 0) {
            $fallbackQuery = ProductSale::query()
                ->with([
                    'product:id,name,price_buy,category_id,thumbnail,image',
                    'product.category:id,name,slug'
                ])
                ->when($pid, fn($qb) => $qb->where('product_id', (int)$pid))
                ->when($q !== '', function($qb) use ($q) {
                    $qb->where(function($x) use ($q) {
                        $x->where('name', 'like', "%{$q}%")
                          ->orWhereHas('product', function($prod) use ($q) {
                              $prod->where('name', 'like', "%{$q}%");
                          });
                    });
                })
                ->where('status', 1)
                ->orderByDesc('created_at')
                ->orderByDesc('date_begin');

            $paginated = $fallbackQuery->paginate(max(1,$per), ['*'], 'page', $page);
        }
        
        // Đảm bảo format đúng
        return response()->json([
            'data' => $paginated->items(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
            'from' => $paginated->firstItem(),
            'to' => $paginated->lastItem(),
        ]);
    }

    public function show(int $id)
    {
        try {
            // Chỉ lấy các cột cần thiết, tránh tính toán appends nặng của Product
            $item = ProductSale::with([
                    'product:id,name,price_buy,category_id',
                    'product.category:id,name,slug'
                ])->findOrFail($id);

            // Loại bỏ appends để tránh lỗi phát sinh từ accessor phức tạp
            if ($item->relationLoaded('product') && $item->product) {
                $item->product->setAppends([]); // không tính các thuộc tính ảo
            }

            return response()->json($item);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Not found'], 404);
        } catch (\Throwable $e) {
            Log::error('ProductSale show failed: '.$e->getMessage(), [
                'id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Server error'], 500);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'       => ['nullable','string','max:191'], // Không bắt buộc
            'product_id' => ['required','integer','min:1'],
            'price_sale' => ['required','numeric','min:0'],
            'date_begin' => ['required','date'],
            'date_end'   => ['required','date','after_or_equal:date_begin'],
            'status'     => ['nullable','integer', Rule::in([0,1])],
        ]);

        // Nếu không có name, tự tạo từ tên sản phẩm
        if (empty($data['name'])) {
            $product = \App\Models\Product::find((int)$data['product_id']);
            $data['name'] = $product ? $product->name : 'Khuyến mãi #' . time();
        }

        $data['created_at'] = Carbon::now();
        $data['created_by'] = auth()->id ?? 1;
        $data['status']     = $data['status'] ?? 1;

        $item = ProductSale::create($data);
        return response()->json($item, 201);
    }

    public function update(Request $request, int $id)
    {
        $item = ProductSale::findOrFail($id);

        $data = $request->validate([
            'name'       => ['sometimes','required','string','max:191'],
            'product_id' => ['sometimes','required','integer','min:1'],
            'price_sale' => ['sometimes','required','numeric','min:0'],
            'date_begin' => ['sometimes','required','date'],
            'date_end'   => ['sometimes','required','date','after_or_equal:date_begin'],
            'status'     => ['sometimes','nullable','integer', Rule::in([0,1])],
        ]);

        $data['updated_at'] = Carbon::now();
        $data['updated_by'] = auth()->id ?? 1;

        $item->fill($data)->save();
        return response()->json($item);
    }

    // Xóa mềm: đổi status=0
    public function destroy(int $id)
    {
        $item = ProductSale::findOrFail($id);
        $item->status     = 0;
        $item->updated_at = Carbon::now();
        $item->updated_by = auth()->id ?? 1;
        $item->save();

        return response()->json(['message' => 'Sale disabled (status=0)']);
    }

    // GET /api/v1/product-sale/active/{productId}
    public function activeForProduct(int $productId)
    {
        $now = Carbon::now();

        $sale = ProductSale::where([
                    ['product_id', '=', $productId],
                    ['status',     '=', 1],
                ])
                ->where('date_begin', '<=', $now)
                ->where('date_end',   '>=', $now)
                ->orderByDesc('date_begin')
                ->first();

        return response()->json($sale ?? null);
    }
}

