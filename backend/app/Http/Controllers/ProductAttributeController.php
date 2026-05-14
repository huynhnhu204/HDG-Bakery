<?php

namespace App\Http\Controllers;

use App\Models\ProductAttribute;
use Illuminate\Http\Request;

class ProductAttributeController extends Controller
{
    // GET /api/v1/product-attribute?product_id=1&attribute_id=2&per_page=50
    public function index(Request $request)
    {
        $pid = $request->query('product_id');
        $aid = $request->query('attribute_id');
        $per = (int)$request->query('per_page', 30);

        $q = ProductAttribute::query()
            ->when($pid, fn($qb)=>$qb->where('product_id',(int)$pid))
            ->when($aid, fn($qb)=>$qb->where('attribute_id',(int)$aid))
            ->orderBy('id');

        return response()->json($q->paginate(max(1,$per)));
    }

    public function show(int $id)
    {
        return response()->json(ProductAttribute::findOrFail($id));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'product_id'   => ['required','integer','min:1'],
            'attribute_id' => ['required','integer','min:1'],
            'value'        => ['required','string','max:255'],
        ]);

        $item = ProductAttribute::create($data);
        return response()->json($item, 201);
    }

    public function update(Request $request, int $id)
    {
        $item = ProductAttribute::findOrFail($id);
        $data = $request->validate([
            'product_id'   => ['sometimes','required','integer','min:1'],
            'attribute_id' => ['sometimes','required','integer','min:1'],
            'value'        => ['sometimes','required','string','max:255'],
        ]);

        $item->fill($data)->save();
        return response()->json($item);
    }

    public function destroy(int $id)
    {
        ProductAttribute::where('id',$id)->delete();
        return response()->json(['message'=>'Deleted']);
    }
}
