<?php

namespace App\Http\Controllers;

use App\Models\Menu;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class MenuController extends Controller
{
    // GET /api/v1/menus?position=&type=&q=&status=&per_page=&page=
    public function index(Request $r)
    {
        $pos  = $r->query('position');
        $type = $r->query('type');
        $q    = $r->query('q');
        $stat = $r->query('status');
        $per  = max(1, (int)$r->query('per_page', 50));

        $rows = Menu::query()
            ->when($pos,  fn($qb)=>$qb->where('position',$pos))
            ->when($type, fn($qb)=>$qb->where('type',$type))
            ->when(isset($stat), fn($qb)=>$qb->where('status',(int)$stat))
            ->when($q,    fn($qb)=>$qb->where('name','like',"%$q%"))
            ->orderBy('position')->orderBy('parent_id')->orderBy('sort_order')->orderBy('id')
            ->paginate($per);

        return response()->json($rows);
    }

    // GET /api/v1/menus/tree?position=mainmenu[,footermenu]&status=1
    public function tree(Request $r)
    {
        $positions    = $r->query('position', 'mainmenu');
        $stat         = $r->query('status', 1);
        $positionList = array_filter(array_map('trim', explode(',', $positions)));

        $buildTree = function($rows) {
            $byParent = [];
            foreach ($rows as $m) { $byParent[$m->parent_id][] = $m; }
            $build = function ($pid) use (&$build, $byParent) {
                $nodes = $byParent[$pid] ?? [];
                return array_map(function ($n) use (&$build) {
                    // ✅ Tự động tạo link cho category menu
                    $link = $n->link;
                    if ($n->type === 'category' && $n->table_id) {
                        $category = Category::find($n->table_id);
                        if ($category && $category->slug) {
                            $link = '/category/' . $category->slug;
                        }
                    }
                    
                    return [
                        'id'         => $n->id,
                        'name'       => $n->name,
                        'link'       => $link,
                        'type'       => $n->type,
                        'parent_id'  => $n->parent_id, // ✅ Thêm parent_id
                        'table_id'   => $n->table_id,   // ✅ Thêm table_id
                        'position'   => $n->position,   // ✅ Thêm position
                        'sort_order' => $n->sort_order,
                        'status'     => $n->status,     // ✅ Thêm status
                        'children'   => $build($n->id),
                    ];
                }, $nodes);
            };
            return $build(0);
        };

        if (count($positionList) <= 1) {
            $pos  = $positionList[0] ?? 'mainmenu';
            $rows = Menu::query()
                ->where('position',$pos)
                ->when(isset($stat), fn($qb)=>$qb->where('status',(int)$stat))
                ->orderBy('parent_id')->orderBy('sort_order')->orderBy('id')
                ->get(['id','name','link','type','parent_id','table_id','position','sort_order','status']);
            return response()->json($buildTree($rows));
        }

        $out = [];
        foreach ($positionList as $pos) {
            $rows = Menu::query()
                ->where('position',$pos)
                ->when(isset($stat), fn($qb)=>$qb->where('status',(int)$stat))
                ->orderBy('parent_id')->orderBy('sort_order')->orderBy('id')
                ->get(['id','name','link','type','parent_id','table_id','position','sort_order','status']);
            $out[$pos] = $buildTree($rows);
        }
        return response()->json($out);
    }

    public function show(int $id)
    {
        return response()->json(Menu::findOrFail($id));
    }

    public function store(Request $r)
    {
        $data = $r->validate([
            'name'       => ['required','string','max:191'],
            'link'       => ['nullable','string','max:255'], // ✅ Cho phép null, sẽ set default sau
            'type'       => ['nullable','string', Rule::in(['category', 'page', 'topic', 'custom'])], // ✅ Enum validation
            'parent_id'  => ['nullable','integer','min:0'],
            'sort_order' => ['nullable','integer','min:0'],
            'table_id'   => ['nullable','integer','min:0'], // ✅ Cho phép 0
            'position'   => ['nullable','string', Rule::in(['mainmenu', 'footermenu'])], // ✅ Enum validation
            'status'     => ['nullable','integer', Rule::in([0, 1])],
            // ✅ cho phép truyền ngày nhập
            'created_at' => ['nullable','date'],
        ]);

        // ✅ Set default values theo schema
        $data['type']       = $data['type'] ?? 'custom';
        $data['parent_id']  = $data['parent_id'] ?? 0;
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['position']   = $data['position'] ?? 'mainmenu';
        $data['status']     = $data['status'] ?? 1;
        $data['table_id']   = $data['table_id'] ?? null;

        // ✅ Tự động tạo link cho category menu
        if ($data['type'] === 'category' && $data['table_id']) {
            $category = Category::find($data['table_id']);
            if ($category && $category->slug) {
                $data['link'] = '/category/' . $category->slug;
            } else {
                $data['link'] = $data['link'] ?? '#';
            }
        } else {
            $data['link'] = $data['link'] ?? '#'; // ✅ Đảm bảo link không null (theo schema Not Null)
        }

        $userId = Auth::id() ?? 1;
        $now = Carbon::now();
        // Nếu FE gửi created_at thì parse, nếu không thì now()
        $data['created_at'] = isset($data['created_at']) && $data['created_at'] 
            ? Carbon::parse($data['created_at']) 
            : $now;
        $data['created_by'] = $userId;
        $data['updated_at'] = null; // ✅ Khởi tạo null
        $data['updated_by'] = null; // ✅ Khởi tạo null

        $row = Menu::create($data);
        return response()->json($row, 201);
    }

    public function update(Request $r, int $id)
    {
        $row = Menu::findOrFail($id);

        $data = $r->validate([
            'name'       => ['sometimes','required','string','max:191'],
            'link'       => ['sometimes','nullable','string','max:255'], // ✅ Cho phép null, sẽ xử lý sau
            'type'       => ['sometimes','nullable','string', Rule::in(['category', 'page', 'topic', 'custom'])], // ✅ Enum validation
            'parent_id'  => ['sometimes','nullable','integer','min:0'],
            'sort_order' => ['sometimes','nullable','integer','min:0'],
            'table_id'   => ['sometimes','nullable','integer','min:0'], // ✅ Cho phép 0
            'position'   => ['sometimes','nullable','string', Rule::in(['mainmenu', 'footermenu'])], // ✅ Enum validation
            'status'     => ['sometimes','nullable','integer', Rule::in([0, 1])],
            // ✅ cho phép cập nhật ngày nhập + ngày sửa
            'created_at' => ['sometimes','nullable','date'],
            'updated_at' => ['sometimes','nullable','date'],
        ]);

        // ✅ Tự động tạo link cho category menu khi update
        if (isset($data['type']) && $data['type'] === 'category' && isset($data['table_id']) && $data['table_id']) {
            $category = Category::find($data['table_id']);
            if ($category && $category->slug) {
                $data['link'] = '/category/' . $category->slug;
            }
        } elseif (isset($data['table_id']) && $row->type === 'category' && $data['table_id']) {
            // Nếu chỉ update table_id cho category menu hiện có
            $category = Category::find($data['table_id']);
            if ($category && $category->slug) {
                $data['link'] = '/category/' . $category->slug;
            }
        }

        // ✅ Xử lý link: đảm bảo không null (theo schema Not Null)
        // Nếu update link và link rỗng/null, giữ link cũ hoặc dùng '#'
        if (array_key_exists('link', $data)) {
            if ($data['link'] === null || $data['link'] === '') {
                $data['link'] = $row->link ?? '#';
            }
        }

        if (isset($data['created_at'])) {
            $data['created_at'] = Carbon::parse($data['created_at']);
        }
        
        $userId = Auth::id() ?? 1;
        // Nếu FE không gửi updated_at thì mình tự set now()
        $data['updated_at'] = isset($data['updated_at'])
            ? Carbon::parse($data['updated_at'])
            : Carbon::now();
        $data['updated_by'] = $userId;

        $row->fill($data)->save();
        return response()->json($row);
    }

    // DELETE /api/v1/menus/{id} — Đưa vào thùng rác (status=0) đệ quy cả con cháu
    public function destroy(int $id)
    {
        $root  = Menu::findOrFail($id);
        $ids   = [$root->id];
        $stack = [$root->id];

        while ($stack) {
            $pid = array_pop($stack);
            $children = Menu::where('parent_id',$pid)->pluck('id')->all();
            foreach ($children as $cid) {
                $ids[]   = $cid;
                $stack[] = $cid;
            }
        }

        Menu::whereIn('id',$ids)->update([
            'status'     => 0,
            'updated_at' => Carbon::now(),
            'updated_by' => Auth::id() ?? 1,
        ]);

        return response()->json(['message' => 'Hidden recursively', 'ids' => $ids]);
    }

    /** GET /api/v1/menus/trash — danh sách đang ẩn (status=0) */
    public function trash(Request $r)
    {
        $pos  = $r->query('position');
        $type = $r->query('type');
        $q    = $r->query('q');
        $per  = max(1, (int)$r->query('per_page', 50));

        $rows = Menu::query()
            ->where('status', 0)
            ->when($pos,  fn($qb) => $qb->where('position',$pos))
            ->when($type, fn($qb) => $qb->where('type',$type))
            ->when($q,    fn($qb) => $qb->where('name','like',"%$q%"))
            ->orderByDesc('updated_at')
            ->orderBy('id')
            ->paginate($per);

        return response()->json([
            'data'         => $rows->items(),
            'total'        => $rows->total(),
            'last_page'    => $rows->lastPage(),
            'current_page' => $rows->currentPage(),
            'per_page'     => $rows->perPage(),
        ]);
    }

    /** POST /api/v1/menus/{id}/restore — khôi phục từ thùng rác */
    public function restore(int $id)
    {
        $row = Menu::findOrFail($id);
        $row->status = 1;
        $row->updated_at = Carbon::now();
        $row->updated_by = Auth::id() ?? 1;
        $row->save();

        return response()->json(['message' => 'Restored']);
    }

    /** POST /api/v1/menus/restore  body: { ids: [] } */
    public function bulkRestore(Request $r)
    {
        $ids = (array)$r->input('ids', []);
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return response()->json(['message' => 'No IDs'], 422);

        Menu::whereIn('id', $ids)->update([
            'status'     => 1,
            'updated_at' => Carbon::now(),
            'updated_by' => Auth::id() ?? 1,
        ]);

        return response()->json(['message' => 'Restored', 'count' => count($ids)]);
    }

    /** DELETE /api/v1/menus/{id}/purge — xoá vĩnh viễn */
    public function purge(int $id)
    {
        $row = Menu::findOrFail($id);
        $row->delete();

        return response()->json(['message' => 'Purged']);
    }

    /** DELETE /api/v1/menus/purge  body: { ids: [] } */
    public function bulkPurge(Request $r)
    {
        $ids = (array)$r->input('ids', []);
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return response()->json(['message' => 'No IDs'], 422);

        Menu::whereIn('id', $ids)->delete();

        return response()->json(['message' => 'Purged', 'count' => count($ids)]);
    }
}
