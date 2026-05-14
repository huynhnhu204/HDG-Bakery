<?php

namespace App\Http\Controllers;

use App\Models\Banner;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class BannerController extends Controller
{
    // GET /api/v1/banners?position=slideshow&status=1&per_page=0
    public function index(Request $r)
    {
        $position = $r->query('position');  // slideshow | ads | ...
        $status   = $r->query('status', 1); // mặc định 1
        $perPage  = (int)$r->query('per_page', 20);

        $q = Banner::query()
            ->when($position, fn($qb)=>$qb->where('position', $position))
            ->when($status !== null && $status !== '', fn($qb)=>$qb->where('status', (int)$status))
            ->orderBy('position')->orderBy('sort_order')->orderBy('id');

        if ($perPage === 0) {
            return response()->json($q->get());
        }
        return response()->json($q->paginate(max(1, $perPage)));
    }

    // POST /api/v1/banners (multipart/form-data)
    // - Nếu có file 'image_file' → lưu vào storage và set $data['image'] = 'storage/...'
    // - Nếu không có file → yêu cầu 'image' là string URL/đường dẫn hợp lệ
    public function store(Request $r)
    {
        $hasFile = $r->hasFile('image_file');

        $rules = [
            'name'       => 'required|string|max:255',
            'link'       => 'nullable|string|max:255',
            'position'   => 'required|in:slideshow,ads',
            'sort_order' => 'nullable|integer|min:0',
            'description'=> 'nullable|string',
            'status'     => 'nullable|integer|in:0,1',
        ];
        // nếu không upload file thì yêu cầu image (string)
        if (!$hasFile) {
            $rules['image'] = 'required|string|max:255';
        }

        $data = $r->validate($rules);

        // Nếu có file thì lưu và set image
        if ($hasFile) {
            $file = $r->file('image_file');
            $dir  = 'banners/'.now()->format('Ym');
            $path = $file->storePublicly($dir, 'public'); // storage/app/public/...
            $data['image'] = 'storage/'.$path;            // ↓ FE sẽ dùng image_url nên ok
        }

        $data['status']     = $data['status'] ?? 1;
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['created_at'] = Carbon::now();
        $data['created_by'] = Auth::id() ?? 1;

        $item = Banner::create($data);
        return response()->json($item, 201);
    }

    public function show(Banner $banner)
    {
        return response()->json($banner);
    }

    // PUT/PATCH /api/v1/banners/{banner} (cũng chấp nhận multipart để thay ảnh)
    public function update(Request $r, Banner $banner)
    {
        $hasFile = $r->hasFile('image_file');

        $rules = [
            'name'       => 'sometimes|required|string|max:255',
            'link'       => 'nullable|string|max:255',
            'position'   => 'sometimes|required|in:slideshow,ads',
            'sort_order' => 'nullable|integer|min:0',
            'description'=> 'nullable|string',
            'status'     => 'nullable|integer|in:0,1',
        ];
        // chỉ khi không có file & muốn đổi image string
        if (!$hasFile && $r->has('image')) {
            $rules['image'] = 'sometimes|required|string|max:255';
        }

        $data = $r->validate($rules);

        if ($hasFile) {
            $file = $r->file('image_file');
            $dir  = 'banners/'.now()->format('Ym');
            $path = $file->storePublicly($dir, 'public');
            $data['image'] = 'storage/'.$path;
        }

        $data['updated_at'] = Carbon::now();
        $data['updated_by'] = Auth::id() ?? 1;

        $banner->fill($data)->save();
        return response()->json($banner);
    }

    // DELETE /api/v1/banners/{banner} — Đưa vào thùng rác (status=0)
    public function destroy(Banner $banner)
    {
        $banner->status = 0;
        $banner->updated_at = Carbon::now();
        $banner->updated_by = Auth::id() ?? 1;
        $banner->save();

        return response()->json(['message' => 'Hidden']);
    }

    /** GET /api/v1/banners/trash — danh sách đang ẩn (status=0) */
    public function trash(Request $r)
    {
        $position = $r->query('position');
        $perPage  = max(1, (int)$r->query('per_page', 20));

        $q = Banner::query()
            ->where('status', 0)
            ->when($position, fn($qb) => $qb->where('position', $position))
            ->orderByDesc('updated_at')
            ->orderBy('id');

        $rows = $q->paginate($perPage);

        return response()->json([
            'data'         => $rows->items(),
            'total'        => $rows->total(),
            'last_page'    => $rows->lastPage(),
            'current_page' => $rows->currentPage(),
            'per_page'     => $rows->perPage(),
        ]);
    }

    /** POST /api/v1/banners/{banner}/restore — khôi phục từ thùng rác */
    public function restore(Banner $banner)
    {
        $banner->status = 1;
        $banner->updated_at = Carbon::now();
        $banner->updated_by = Auth::id() ?? 1;
        $banner->save();

        return response()->json(['message' => 'Restored']);
    }

    /** POST /api/v1/banners/restore  body: { ids: [] } */
    public function bulkRestore(Request $r)
    {
        $ids = (array)$r->input('ids', []);
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return response()->json(['message' => 'No IDs'], 422);

        Banner::whereIn('id', $ids)->update([
            'status'     => 1,
            'updated_at' => Carbon::now(),
            'updated_by' => Auth::id() ?? 1,
        ]);

        return response()->json(['message' => 'Restored', 'count' => count($ids)]);
    }

    /** DELETE /api/v1/banners/{banner}/purge — xoá vĩnh viễn */
    public function purge(Banner $banner)
    {
        $banner->delete();
        return response()->json(['message' => 'Purged']);
    }

    /** DELETE /api/v1/banners/purge  body: { ids: [] } */
    public function bulkPurge(Request $r)
    {
        $ids = (array)$r->input('ids', []);
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return response()->json(['message' => 'No IDs'], 422);

        Banner::whereIn('id', $ids)->delete();

        return response()->json(['message' => 'Purged', 'count' => count($ids)]);
    }
}
