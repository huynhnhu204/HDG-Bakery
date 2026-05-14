<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\TagSuggest;
use App\Models\Allergen;
use Illuminate\Http\Request;

class LookupController extends Controller
{
    /** GET /api/v1/lookups  -> dữ liệu động dùng chung cho FE */
    public function index(Request $r)
    {
        // Có thể cache 10 phút cho nhẹ server
        $categories = cache()->remember('lookup:categories', 600, function () use ($r) {
            return Category::query()
                ->select('id','name')
                ->when($r->q, fn($q)=>$q->where('name','like','%'.$r->q.'%'))
                ->orderBy('name')->get();
        });

        // Nếu request có query param ?format=simple, trả về array strings (cho autocomplete)
        // Nếu có ?refresh=1, bypass cache và lấy dữ liệu mới
        $refresh = $r->has('refresh') && $r->query('refresh') === '1';
        
        if ($r->has('format') && $r->query('format') === 'simple') {
            if ($refresh) {
                cache()->forget('lookup:tag_suggests:simple');
            }
            $tagSuggests = cache()->remember('lookup:tag_suggests:simple', 600, function () {
                return TagSuggest::where('status',1)->orderBy('tag')->pluck('tag');
            });
        } else {
            // Trả về cả id, tag, status để frontend có thể toggle (cho admin page)
            if ($refresh) {
                cache()->forget('lookup:tag_suggests');
            }
            $tagSuggests = cache()->remember('lookup:tag_suggests', 600, function () {
                return TagSuggest::where('status',1)->orderBy('tag')->get(['id','tag','status']);
            });
        }

        $allergens = cache()->remember('lookup:allergens', 600, function () {
            return Allergen::active()
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'status']);
        });

        // channels để trong config để khớp rule validate in:pickup,delivery
        $channels = config('lookup.channels', ['pickup','delivery']);

        return response()->json([
            'categories' => $categories,
            'tagSuggests'=> $tagSuggests,
            'allergens'  => $allergens,
            'channels'   => $channels,
        ]);
    }

    /** POST /api/v1/lookups/tags  body: { tag: "Sinh nhật", status?:0|1 } */
    public function createTag(Request $r)
    {
        $data = $r->validate([
            'tag'    => 'required|string|max:50',
            'status' => 'nullable|in:0,1'
        ]);
        $row = TagSuggest::create([
            'tag' => $data['tag'],
            'status' => $data['status'] ?? 1
        ]);
        cache()->forget('lookup:tag_suggests');
        return response()->json($row, 201);
    }

    /** POST /api/v1/lookups/tags/{id}/toggle */
    public function toggleTag($id)
    {
        $t = TagSuggest::findOrFail($id);
        $t->status = $t->status ? 0 : 1;
        $t->save();
        cache()->forget('lookup:tag_suggests');
        return response()->json(['message'=>'ok','status'=>$t->status]);
    }
}
