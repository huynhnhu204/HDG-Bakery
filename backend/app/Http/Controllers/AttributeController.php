<?php

namespace App\Http\Controllers;

use App\Models\Attribute;
use Illuminate\Http\Request;

class AttributeController extends Controller
{
    // GET /api/attribute?q=si&per_page=20
    public function index(Request $request)
    {
        $q   = $request->query('q');
        $per = (int)$request->query('per_page', 20);

        $rs = Attribute::query()
            ->when($q, fn($qb)=>$qb->where('name','like',"%$q%"))
            ->orderBy('id')
            ->paginate(max(1,$per));
        return response()->json($rs);
    }

    public function show(int $id)
    {
        return response()->json(Attribute::findOrFail($id));
    }

    public function store(Request $request)
    {
        $data = $request->validate(['name'=>['required','string','max:191']]);
        $item = Attribute::create($data);
        return response()->json($item, 201);
    }

    public function update(Request $request, int $id)
    {
        $item = Attribute::findOrFail($id);
        $data = $request->validate(['name'=>['required','string','max:191']]);
        $item->fill($data)->save();
        return response()->json($item);
    }

    public function destroy(int $id)
    {
        Attribute::where('id',$id)->delete();
        return response()->json(['message'=>'Deleted']);
    }
}
