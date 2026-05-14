<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    /* =========================================================
     | Helpers
     * ========================================================= */

    /**
     * Sinh slug duy nhất trong bảng category (đúng theo tên bảng đang dùng).
     */
    private function uniqueSlug(string $base, ?int $ignoreId = null): string
    {
        $baseSlug = Str::slug($base) ?: 'category';
        $slug = $baseSlug;
        $i = 1;

        while (
            DB::table('category')
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->where('slug', $slug)
                ->exists()
        ) {
            $i++;
            $slug = $baseSlug . '-' . $i;
        }

        return $slug;
    }

    /* =========================================================
     | Index / List
     * ========================================================= */

    /** GET /api/v1/categories */
    public function index(Request $request)
    {
        $q          = trim((string) $request->query('q', ''));
        $status     = $request->query('status');         // "", "0", "1" or null
        $parentId   = $request->query('parent_id');      // optional
        $perPageArg = (int) $request->query('per_page', 12);
        $withCounts = (int) $request->query('withCounts', 0) === 1;

        $query = Category::query()
            ->when($q !== '', function ($qb) use ($q) {
                $qb->where(function ($x) use ($q) {
                    $x->where('name', 'like', "%{$q}%")
                      ->orWhere('slug', 'like', "%{$q}%");
                });
            })
            ->when($status !== null && $status !== '', fn ($qb) => $qb->where('status', (int) $status))
            ->when($parentId !== null && $parentId !== '', fn ($qb) => $qb->where('parent_id', (int) $parentId))
            ->orderBy('sort_order')
            ->orderByDesc('id');

        if ($withCounts) {
            // optional: chỉ đếm sản phẩm đang hiển thị
            $query->withCount(['products' => fn ($x) => $x->where('status', 1)]);
        }

        // per_page = 0 => trả full (mảng) để FE load dropdown nhanh
        if ($perPageArg === 0) {
            $list = $query->get(['id', 'name', 'slug', 'image', 'parent_id', 'sort_order', 'description', 'status']);
            // ✅ Thêm image_url vào response
            $list->transform(function ($cat) {
                $cat->image_url = $cat->image_url;
                return $cat;
            });
            return response()->json($list);
        }

        $perPage = max(1, $perPageArg);
        $cats = $query->paginate($perPage);
        
        // ✅ Thêm image_url vào response
        $cats->getCollection()->transform(function ($cat) {
            $cat->image_url = $cat->image_url;
            return $cat;
        });

        return response()->json([
            'data'         => $cats->items(),
            'total'        => $cats->total(),
            'last_page'    => $cats->lastPage(),
            'current_page' => $cats->currentPage(),
            'per_page'     => $cats->perPage(),
        ]);
    }

    /** GET /api/v1/categories/tree */
    public function tree()
    {
        $data = Category::where('status', 1)
            ->orderBy('parent_id')
            ->orderBy('sort_order')
            ->get();

        $byParent = [];
        foreach ($data as $c) {
            $byParent[$c->parent_id][] = $c;
        }

        $build = function ($pid) use (&$build, $byParent) {
            $nodes = $byParent[$pid] ?? [];
            return array_map(function ($n) use (&$build) {
                return [
                    'id'          => $n->id,
                    'name'        => $n->name,
                    'slug'        => $n->slug,
                    'image'       => $n->image,
                    'image_url'   => $n->image_url, // ✅ Thêm image_url
                    'parent_id'   => $n->parent_id,
                    'sort_order'  => $n->sort_order,
                    'description' => $n->description, // ✅ Thêm description
                    'status'      => $n->status,
                    'children'    => $build($n->id),
                ];
            }, $nodes);
        };

        return response()->json($build(0));
    }

    /* =========================================================
     | CRUD
     * ========================================================= */

    /** POST /api/v1/categories */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:191'],
            'slug'        => ['nullable', 'string', 'max:191'],
            'image'       => ['nullable', 'string', 'max:255'],
            'parent_id'   => ['nullable', 'integer', 'min:0'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
            'description' => ['nullable', 'string'],
            'status'      => ['nullable', 'integer', Rule::in([0, 1])],
        ]);

        $data['slug']       = $this->uniqueSlug($data['slug'] ?: $data['name']);
        $data['parent_id']  = $data['parent_id'] ?? 0;
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['status']     = $data['status'] ?? 1;

        $userId = Auth::id() ?? 1;
        $now = now();
        $data['created_at'] = $now;
        $data['created_by'] = $userId;
        $data['updated_at'] = $now;
        $data['updated_by'] = $userId;

        $cat = Category::create($data);
        
        // ✅ Thêm image_url vào response
        $cat->image_url = $cat->image_url;

        return response()->json($cat, 201);
    }

    /** GET /api/v1/categories/{id} */
    public function show(int $id)
    {
        $cat = Category::findOrFail($id);
        // ✅ Thêm image_url vào response
        $cat->image_url = $cat->image_url;
        return response()->json($cat);
    }

    /** GET /api/v1/categories/by-slug/{slug} */
    public function showBySlug(string $slug)
    {
        $cat = Category::where('slug', $slug)->first();
        if (!$cat) {
            return response()->json(['message' => 'Not found'], 404);
        }
        // ✅ Thêm image_url vào response
        $cat->image_url = $cat->image_url;
        return response()->json($cat);
    }

    /** PUT/PATCH /api/v1/categories/{id} */
    public function update(Request $request, int $id)
    {
        $cat = Category::findOrFail($id);

        $data = $request->validate([
            'name'        => ['sometimes', 'required', 'string', 'max:191'],
            'slug'        => ['sometimes', 'nullable', 'string', 'max:191'],
            'image'       => ['sometimes', 'nullable', 'string', 'max:255'],
            'parent_id'   => ['sometimes', 'nullable', 'integer', 'min:0'],
            'sort_order'  => ['sometimes', 'nullable', 'integer', 'min:0'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status'      => ['sometimes', 'nullable', 'integer', Rule::in([0, 1])],
        ]);

        if (array_key_exists('slug', $data)) {
            $base = $data['slug'] ?: ($data['name'] ?? $cat->name);
            $data['slug'] = $this->uniqueSlug($base, $cat->id);
        }

        $userId = Auth::id() ?? 1;
        $data['updated_at'] = now();
        $data['updated_by'] = $userId;

        $cat->fill($data)->save();
        
        // ✅ Thêm image_url vào response
        $cat->image_url = $cat->image_url;

        return response()->json($cat);
    }

    /**
     * DELETE /api/v1/categories/{id}
     * - Nếu ?force=1 → xoá vĩnh viễn (purge)
     * - Ngược lại → "xoá (ẩn)" = status = 0
     */
    public function destroy(int $id, Request $req)
    {
        $force = (int) $req->query('force', 0) === 1;

        $cat = Category::findOrFail($id);

        if ($force) {
            // Nếu model có SoftDeletes thì forceDelete(); nếu không có cứ delete();
            if (method_exists($cat, 'forceDelete')) {
                $cat->forceDelete();
            } else {
                $cat->delete();
            }
            return response()->json(['message' => 'Purged'], 200);
        }

        // Soft-hide: status=0
        $cat->status     = 0;
        $cat->updated_by = Auth::id() ?? 1;
        $cat->save();

        return response()->json(['message' => 'Hidden'], 200);
    }

    /* =========================================================
     | Trash View + Restore + Purge (theo routes riêng)
     * ========================================================= */

    /** GET /api/v1/categories/trash */
    public function trash(Request $request)
    {
        $q       = trim((string) $request->query('q', ''));
        $perPage = max(1, (int) $request->query('per_page', 12));

        $query = Category::query()
            ->where('status', 0)
            ->when($q !== '', function ($qb) use ($q) {
                $qb->where(function ($x) use ($q) {
                    $x->where('name', 'like', "%{$q}%")
                      ->orWhere('slug', 'like', "%{$q}%");
                });
            })
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->withCount(['products' => fn ($x) => $x->where('status', 1)]);

        $cats = $query->paginate($perPage);
        
        // ✅ Thêm image_url vào response
        $cats->getCollection()->transform(function ($cat) {
            $cat->image_url = $cat->image_url;
            return $cat;
        });

        return response()->json([
            'data'         => $cats->items(),
            'total'        => $cats->total(),
            'last_page'    => $cats->lastPage(),
            'current_page' => $cats->currentPage(),
            'per_page'     => $cats->perPage(),
        ]);
    }

    /** POST /api/v1/categories/{id}/restore */
    public function restore(int $id)
    {
        $cat = Category::findOrFail($id);
        $cat->status     = 1;
        $cat->updated_by = Auth::id() ?? 1;
        $cat->save();

        return response()->json(['message' => 'Restored'], 200);
    }

    /** POST /api/v1/categories/restore  body: { ids: [] } */
    public function bulkRestore(Request $request)
    {
        $ids = (array) $request->input('ids', []);
        $ids = array_values(array_filter(array_map('intval', $ids)));

        if (empty($ids)) {
            return response()->json(['message' => 'No IDs'], 422);
        }

        Category::whereIn('id', $ids)->update([
            'status'     => 1,
            'updated_by' => Auth::id() ?? 1,
        ]);

        return response()->json(['message' => 'Restored', 'count' => count($ids)], 200);
    }

    /** DELETE /api/v1/categories/{id}/purge */
    public function purge(int $id)
    {
        $cat = Category::findOrFail($id);

        if (method_exists($cat, 'forceDelete')) {
            $cat->forceDelete();
        } else {
            $cat->delete();
        }

        return response()->json(['message' => 'Purged'], 200);
    }

    /** DELETE /api/v1/categories/purge  body: { ids: [] } */
    public function bulkPurge(Request $request)
    {
        $ids = (array) $request->input('ids', []);
        $ids = array_values(array_filter(array_map('intval', $ids)));

        if (empty($ids)) {
            return response()->json(['message' => 'No IDs'], 422);
        }

        $count = 0;

        // Nếu có SoftDeletes: forceDelete(); nếu không: delete()
        foreach ($ids as $id) {
            $cat = Category::find($id);
            if (!$cat) continue;

            if (method_exists($cat, 'forceDelete')) {
                $cat->forceDelete();
            } else {
                $cat->delete();
            }
            $count++;
        }

        return response()->json(['message' => 'Purged', 'count' => $count], 200);
    }
}
