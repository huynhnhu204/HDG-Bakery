<?php

namespace App\Http\Controllers;

use App\Models\{Review, Product};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ReviewController extends Controller
{
    /** Public: list reviews for a product with filters */
    public function index(Request $req, int $productId)
    {
        $sort = $req->get('sort', 'new'); // new|helpful|photos
        $stars = $req->get('stars');      // e.g. 5|4|3
        $hasPhotos = $req->boolean('hasPhotos', false);
        $verified = $req->has('verified') ? $req->boolean('verified') : null;
        $q = $req->get('q');

        $qb = Review::query()
            ->where('product_id', $productId)
            ->where('status', 'approved');

        if ($stars) { $qb->where('rating', (int)$stars); }
        if ($hasPhotos) { $qb->whereNotNull('images')->where('images', '!=', '[]'); }
        if ($verified !== null) { $qb->where('is_verified', $verified); }
        if ($q) { $qb->where(function($s) use ($q){ $s->where('content','like',"%$q%") ->orWhere('title','like',"%$q%"); }); }

        if ($sort === 'helpful') { $qb->orderByDesc('helpful_count'); }
        elseif ($sort === 'photos') { $qb->orderByDesc(DB::raw('JSON_LENGTH(images)')); $qb->orderByDesc('id'); }
        else { $qb->orderByDesc('pinned')->orderByDesc('id'); }

        $reviews = $qb->paginate(10);

        // Summary: average, count, distribution
        $summary = DB::table('reviews')
            ->selectRaw('COUNT(*) as total, AVG(rating) as avg_rating')
            ->where('product_id', $productId)
            ->where('status', 'approved')
            ->first();
        $dist = DB::table('reviews')
            ->select('rating', DB::raw('COUNT(*) as c'))
            ->where('product_id', $productId)
            ->where('status', 'approved')
            ->groupBy('rating')->pluck('c','rating');

        return response()->json([
            'items' => $reviews,
            'summary' => [
                'total' => (int)($summary->total ?? 0),
                'average' => round((float)($summary->avg_rating ?? 0), 2),
                'distribution' => [
                    5 => (int)($dist[5] ?? 0),
                    4 => (int)($dist[4] ?? 0),
                    3 => (int)($dist[3] ?? 0),
                    2 => (int)($dist[2] ?? 0),
                    1 => (int)($dist[1] ?? 0),
                ]
            ]
        ]);
    }

    /** Public: create review (requires product_id, rating, content). Images optional */
    public function store(Request $req)
    {
        // Đảm bảo luôn trả về JSON
        $req->headers->set('Accept', 'application/json');
        
        try {
            $data = $req->validate([
                'product_id' => 'required|integer|exists:product,id',
                'rating'     => 'required|integer|min:1|max:5',
                'title'      => 'nullable|string|max:150',
                'content'    => 'required|string|min:20|max:2000',
                'nickname'   => 'nullable|string|max:80',
                'order_id'   => 'nullable|integer',
                'tags'       => 'nullable|array|max:10',
                'tags.*'     => 'string|max:30',
                'images'     => 'nullable|array|max:5',
                'images.*'   => 'file|image|max:2048',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $e->errors()
            ], 422);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }

        // Basic profanity filter (very simple; extend via config)
        $banned = ['địt','cặc','lol','http://','https://'];
        $lower = mb_strtolower($data['content']);
        foreach ($banned as $bad) {
            if (str_contains($lower, $bad)) {
                // push to pending by default; still accept but mark for review
                $data['status'] = 'pending';
                break;
            }
        }

        $userId = optional($req->user())->id;
        $data['user_id'] = $userId;
        $data['tags'] = $data['tags'] ?? [];

        // Verify purchase: if user has order with this product delivered
        $isVerified = false;
        try {
            $isVerified = DB::table('orders as o')
                ->join('orderdetail as od','od.order_id','=','o.id')
                ->where('od.product_id', $data['product_id'])
                ->when($userId, fn($q)=>$q->where('o.user_id',$userId))
                ->whereIn('o.status', [3]) // delivered/paid
                ->exists();
        } catch (\Throwable $e) {}
        $data['is_verified'] = $isVerified;

        // Uniqueness: one review per user per order/product (basic)
        if ($userId && !empty($data['order_id'])) {
            $exists = Review::where('user_id',$userId)
                ->where('product_id',$data['product_id'])
                ->where('order_id',$data['order_id'])->exists();
            if ($exists) {
                return response()->json(['message' => 'Bạn đã đánh giá sản phẩm này cho đơn hàng này.'], 422);
            }
        }

        $images = $req->file('images', []);

        return DB::transaction(function () use ($data, $images) {
            $paths = [];
            foreach ($images as $img) {
                $path = $img->store('public/reviews');
                $url = 'storage/' . ltrim(str_replace('public/','',$path), '/');
                $paths[] = $url;
            }
            if ($paths) {
                $data['images'] = $paths;
            }

            $review = Review::create($data);
            $this->recomputeProductRating($review->product_id);

            return response()->json([
                'message' => 'Cảm ơn bạn! Đánh giá của bạn sẽ hiển thị sau khi được duyệt.',
                'review' => $review
            ]);
        });
    }

    /** Public: mark helpful (chỉ tăng count, không track chi tiết) */
    public function helpful(Request $req, int $id)
    {
        // TODO: Nếu muốn chặn duplicate, có thể lưu vào session hoặc cache
        // Ở đây đơn giản: chỉ tăng count
        Review::where('id', $id)->increment('helpful_count');
        return response()->json(['ok' => true]);
    }

    /** Public: report review */
    public function report(int $id)
    {
        Review::where('id', $id)->update(['report_count' => DB::raw('report_count + 1')]);
        return response()->json(['ok' => true]);
    }

    /** Public: Featured reviews for homepage (pinned + high rating, limit 6-9) */
    public function featured(Request $req)
    {
        $limit = min(9, max(3, (int)$req->get('limit', 6)));
        
        $reviews = Review::query()
            ->where('status', 'approved')
            ->with('product:id,name,slug,thumbnail')
            ->orderByDesc('pinned')
            ->orderByDesc('rating')
            ->orderByDesc('helpful_count')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => $reviews,
            'total' => $reviews->count()
        ]);
    }

    /** Admin: list & moderate */
    public function adminIndex(Request $req)
    {
        $qb = Review::query();
        if ($req->filled('product_id')) $qb->where('product_id', (int)$req->get('product_id'));
        if ($req->filled('status')) $qb->where('status', $req->get('status'));
        if ($req->filled('rating')) $qb->where('rating', (int)$req->get('rating'));
        $qb->orderByDesc('pinned')->orderByDesc('id');
        return response()->json($qb->paginate(20));
    }

    public function moderate(Request $req, int $id)
    {
        $data = $req->validate([
            'action' => 'required|string|in:approve,hide,pin,unpin',
        ]);
        $review = Review::findOrFail($id);
        if ($data['action'] === 'approve') $review->status = 'approved';
        if ($data['action'] === 'hide') $review->status = 'hidden';
        if ($data['action'] === 'pin') $review->pinned = true;
        if ($data['action'] === 'unpin') $review->pinned = false;
        $review->save();
        $this->recomputeProductRating($review->product_id);
        return response()->json(['ok' => true, 'review' => $review]);
    }

    public function reply(Request $req, int $id)
    {
        $data = $req->validate(['content' => 'required|string|min:5|max:1000']);
        $review = Review::findOrFail($id);
        $review->update([
            'reply_content' => $data['content'],
            'reply_admin_user_id' => optional($req->user())->id,
            'reply_created_at' => now(),
        ]);
        return response()->json(['ok' => true, 'review' => $review]);
    }

    private function recomputeProductRating(int $productId): void
    {
        $row = DB::table('reviews')
            ->selectRaw('COUNT(*) as total, AVG(rating) as avg')
            ->where('product_id', $productId)
            ->where('status', 'approved')
            ->first();
        Product::where('id', $productId)->update([
            'reviews_count' => (int)($row->total ?? 0),
            'average_rating' => round((float)($row->avg ?? 0), 2),
        ]);
    }
}


