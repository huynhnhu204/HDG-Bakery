<?php

namespace App\Http\Controllers;

use App\Models\Topic;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

class TopicController extends Controller
{
    // GET /api/v1/topics?withCounts=1&visibleOnly=1
    public function index(Request $r)
    {
        $q           = $r->query('q');
        $stat        = $r->query('status');
        $withCounts  = $r->boolean('withCounts', false);
        $visibleOnly = $r->boolean('visibleOnly', true);

        $rows = Topic::query()
            ->when($q, fn($qb)=>$qb->where(function($x) use($q){
                $x->where('name','like',"%$q%")->orWhere('slug','like',"%$q%");
            }))
            ->when(isset($stat), fn($qb)=>$qb->where('status',(int)$stat))
            ->orderBy('sort_order')->orderBy('id');

        if ($withCounts) {
            if ($visibleOnly) {
                $rows->withCount(['posts as posts_count' => fn($q)=>$q->where('status',1)->where('post_type','post')]);
            } else {
                $rows->withCount('posts');
            }
            return response()->json($rows->get());
        }

        // paginate mặc định vẫn đếm visible để FE dùng
        $rows->withCount(['posts as posts_count' => fn($q)=>$q->where('status',1)->where('post_type','post')]);
        $per = max(1, (int) $r->query('per_page', 20));
        return response()->json($rows->paginate($per));
    }

    // GET /api/v1/topics/{id}
    public function show(int $id)
    {
        $row = Topic::withCount(['posts as posts_count' => fn($q)=>$q->where('status',1)->where('post_type','post')])
            ->findOrFail($id);
        return response()->json($row);
    }

    // GET /api/v1/topics/slug/{slug}
    public function showBySlug(string $slug)
    {
        $row = Topic::withCount(['posts as posts_count' => fn($q)=>$q->where('status',1)->where('post_type','post')])
            ->where('slug',$slug)->firstOrFail();
        return response()->json($row);
    }

    // POST /api/v1/topics
    public function store(Request $r)
    {
        $data = $r->validate([
            'name'        => ['required','string','max:191'],
            'slug'        => ['nullable','string','max:191'],
            'sort_order'  => ['nullable','integer','min:0'],
            'description' => ['nullable','string'],
            'status'      => ['nullable','integer'],
        ]);

        $data['slug']        = $data['slug'] ?: Str::slug($data['name']);
        $data['status']      = $data['status'] ?? 1;
        $data['created_at']  = Carbon::now();
        $data['created_by']  = Auth::id() ?? 1;

        $row = Topic::create($data);
        return response()->json($row, 201);
    }

    // PUT/PATCH /api/v1/topics/{id}
    public function update(Request $r, int $id)
    {
        $row = Topic::findOrFail($id);

        $data = $r->validate([
            'name'        => ['sometimes','required','string','max:191'],
            'slug'        => ['nullable','string','max:191'],
            'sort_order'  => ['nullable','integer','min:0'],
            'description' => ['nullable','string'],
            'status'      => ['nullable','integer'],
        ]);

        if (array_key_exists('slug', $data) && !$data['slug'] && isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $data['updated_at'] = Carbon::now();
        $data['updated_by'] = Auth::id() ?? 1;

        $row->fill($data)->save();
        return response()->json($row);
    }

    // DELETE /api/v1/topics/{id} — Đưa vào thùng rác (status=0)
    public function destroy(int $id)
    {
        $row = Topic::findOrFail($id);
        $row->status     = 0;
        $row->updated_at = Carbon::now();
        $row->updated_by = Auth::id() ?? 1;
        $row->save();

        return response()->json(['message' => 'Hidden']);
    }

    /** GET /api/v1/topics/trash — danh sách đang ẩn (status=0) */
    public function trash(Request $r)
    {
        $q       = $r->query('q');
        $perPage = max(1, (int) $r->query('per_page', 20));

        $rows = Topic::query()
            ->where('status', 0)
            ->when($q, fn($qb) => $qb->where(function($x) use($q){
                $x->where('name','like',"%$q%")->orWhere('slug','like',"%$q%");
            }))
            ->orderByDesc('updated_at')
            ->paginate($perPage);

        return response()->json([
            'data'         => $rows->items(),
            'total'        => $rows->total(),
            'last_page'    => $rows->lastPage(),
            'current_page' => $rows->currentPage(),
            'per_page'     => $rows->perPage(),
        ]);
    }

    /** POST /api/v1/topics/{id}/restore — khôi phục từ thùng rác */
    public function restore(int $id)
    {
        $row = Topic::findOrFail($id);
        $row->status = 1;
        $row->updated_at = Carbon::now();
        $row->updated_by = Auth::id() ?? 1;
        $row->save();

        return response()->json(['message' => 'Restored']);
    }

    /** POST /api/v1/topics/restore  body: { ids: [] } */
    public function bulkRestore(Request $r)
    {
        $ids = (array)$r->input('ids', []);
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return response()->json(['message' => 'No IDs'], 422);

        Topic::whereIn('id', $ids)->update([
            'status'     => 1,
            'updated_at' => Carbon::now(),
            'updated_by' => Auth::id() ?? 1,
        ]);

        return response()->json(['message' => 'Restored', 'count' => count($ids)]);
    }

    /** DELETE /api/v1/topics/{id}/purge — xoá vĩnh viễn */
    public function purge(int $id)
    {
        $row = Topic::findOrFail($id);
        $row->delete();

        return response()->json(['message' => 'Purged']);
    }

    /** DELETE /api/v1/topics/purge  body: { ids: [] } */
    public function bulkPurge(Request $r)
    {
        $ids = (array)$r->input('ids', []);
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return response()->json(['message' => 'No IDs'], 422);

        Topic::whereIn('id', $ids)->delete();

        return response()->json(['message' => 'Purged', 'count' => count($ids)]);
    }
}
