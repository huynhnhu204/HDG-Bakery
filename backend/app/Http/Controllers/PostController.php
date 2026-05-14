<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PostController extends Controller
{
    // GET /api/v1/posts?post_type=post&page=&per_page=&q=&topic_id=&status=
    public function index(Request $r)
    {
        $per     = max(1, (int) $r->query('per_page', 10));
        $q       = $r->query('q');
        $topicId = $r->query('topic_id');
        $status  = $r->query('status');
        $type    = $r->query('post_type'); // 'post' | 'page'

        $rows = Post::query()
            ->when($q,       fn($qr) => $qr->where('title', 'like', "%$q%"))
            ->when($topicId, fn($qr) => $qr->where('topic_id', (int) $topicId))
            ->when(isset($status), fn($qr) => $qr->where('status', (int) $status))
            ->when($type,    fn($qr) => $qr->where('post_type', $type))
            ->with('topic')
            ->orderByDesc('created_at')
            ->paginate($per);

        return response()->json($rows);
    }

    // GET /api/v1/posts/{id}
    public function show(int $id)
    {
        return response()->json(
            Post::with('topic')->findOrFail($id)
        );
    }

    // GET /api/v1/posts/slug/{slug}
    public function showBySlug(string $slug)
    {
        return response()->json(
            Post::with('topic')->where('slug', $slug)->firstOrFail()
        );
    }

    // POST /api/v1/posts
    public function store(Request $r)
    {
        $data = $r->validate([
            'topic_id'    => ['nullable', 'integer', 'exists:topic,id'],
            'title'       => ['required', 'string', 'max:191'],
            'slug'        => ['nullable', 'string', 'max:191', Rule::unique('post', 'slug')],
            'image'       => ['nullable', 'string', 'max:255'],
            'content'     => ['required', 'string'],
            'description' => ['nullable', 'string'],
            'post_type'   => ['nullable', 'in:post,page'],
            'status'      => ['nullable', 'integer'],
        ]);

        $data['slug']       = $data['slug'] ?: Str::slug($data['title']);
        $data['post_type']  = $data['post_type'] ?: 'post';
        $data['status']     = $data['status'] ?? 1;

        $uid = Auth::id() ?? 1;
        $data['created_by'] = $uid;
        $data['updated_by'] = $uid;

        $row = Post::create($data);
        return response()->json($row, 201);
    }

    // PUT/PATCH /api/v1/posts/{id}
    public function update(Request $r, int $id)
    {
        $row = Post::findOrFail($id);

        $data = $r->validate([
            'topic_id'    => ['sometimes', 'nullable', 'integer', 'exists:topic,id'],
            'title'       => ['sometimes', 'required', 'string', 'max:191'],
            'slug'        => ['sometimes', 'nullable', 'string', 'max:191', Rule::unique('post', 'slug')->ignore($id)],
            'image'       => ['sometimes', 'nullable', 'string', 'max:255'],
            'content'     => ['sometimes', 'required', 'string'],
            'description' => ['sometimes', 'nullable', 'string'],
            'post_type'   => ['sometimes', 'nullable', 'in:post,page'],
            'status'      => ['sometimes', 'nullable', 'integer'],
        ]);

        if (array_key_exists('slug', $data)) {
            $data['slug'] = $data['slug'] ?: Str::slug($data['title'] ?? $row->title);
        }

        $data['updated_by'] = Auth::id() ?? 1;

        $row->fill($data)->save();
        return response()->json($row);
    }

    // DELETE /api/v1/posts/{id}  — Đưa vào thùng rác (status=0)
    public function destroy(int $id)
    {
        $row = Post::findOrFail($id);
        $row->status = 0;
        $row->updated_by = Auth::id() ?? 1;
        $row->save();

        return response()->json(['message' => 'Hidden']);
    }

    /** GET /api/v1/posts/trash — danh sách đang ẩn (status=0) */
    public function trash(Request $r)
    {
        $per     = max(1, (int) $r->query('per_page', 20));
        $q       = $r->query('q');
        $topicId = $r->query('topic_id');
        $type    = $r->query('post_type');

        $rows = Post::query()
            ->where('status', 0)
            ->when($q, fn($qr) => $qr->where('title', 'like', "%$q%"))
            ->when($topicId, fn($qr) => $qr->where('topic_id', (int) $topicId))
            ->when($type, fn($qr) => $qr->where('post_type', $type))
            ->with('topic')
            ->orderByDesc('updated_at')
            ->paginate($per);

        return response()->json([
            'data'         => $rows->items(),
            'total'        => $rows->total(),
            'last_page'    => $rows->lastPage(),
            'current_page' => $rows->currentPage(),
            'per_page'     => $rows->perPage(),
        ]);
    }

    /** POST /api/v1/posts/{id}/restore — khôi phục từ thùng rác */
    public function restore(int $id)
    {
        $row = Post::findOrFail($id);
        $row->status = 1;
        $row->updated_by = Auth::id() ?? 1;
        $row->save();

        return response()->json(['message' => 'Restored']);
    }

    /** POST /api/v1/posts/restore  body: { ids: [] } */
    public function bulkRestore(Request $r)
    {
        $ids = (array)$r->input('ids', []);
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return response()->json(['message' => 'No IDs'], 422);

        Post::whereIn('id', $ids)->update([
            'status'     => 1,
            'updated_by' => Auth::id() ?? 1,
        ]);

        return response()->json(['message' => 'Restored', 'count' => count($ids)]);
    }

    /** DELETE /api/v1/posts/{id}/purge — xoá vĩnh viễn */
    public function purge(int $id)
    {
        $row = Post::findOrFail($id);
        $row->delete();

        return response()->json(['message' => 'Purged']);
    }

    /** DELETE /api/v1/posts/purge  body: { ids: [] } */
    public function bulkPurge(Request $r)
    {
        $ids = (array)$r->input('ids', []);
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return response()->json(['message' => 'No IDs'], 422);

        Post::whereIn('id', $ids)->delete();

        return response()->json(['message' => 'Purged', 'count' => count($ids)]);
    }
}
