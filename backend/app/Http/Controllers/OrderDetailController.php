<?php

namespace App\Http\Controllers;

use App\Models\OrderDetail;
use Illuminate\Http\Request;

class OrderDetailController extends Controller
{
    // GET /api/v1/order-details?order_id=1&per_page=50
    public function index(Request $request)
    {
        $orderId = $request->query('order_id');
        $per     = max(1, (int)$request->query('per_page', 50));

        $q = OrderDetail::query()
            ->when($orderId, fn($qb) => $qb->where('order_id', (int)$orderId))
            ->orderBy('id');

        return response()->json($q->paginate($per));
    }

    // GET /api/v1/order-details/{id}
    public function show(int $id)
    {
        return response()->json(OrderDetail::findOrFail($id));
    }

    // POST /api/v1/order-details
    public function store(Request $request)
    {
        $data = $request->validate([
            'order_id'   => ['required','integer','min:1'],
            'product_id' => ['nullable','integer','min:1'],
            'name'       => ['nullable','string','max:191'],
            'price'      => ['required','numeric','min:0'],
            'qty'        => ['required','integer','min:1'],
            'discount'   => ['nullable','numeric','min:0'],
        ]);

        $price = (float)$data['price'];
        $qty   = (int)$data['qty'];

        $item = OrderDetail::create([
            'order_id'   => (int)$data['order_id'],
            'product_id' => $data['product_id'] ?? null,
            'name'       => $data['name'] ?? null,
            'price'      => $price,
            'qty'        => $qty,
            'discount'   => (float)($data['discount'] ?? 0),
            'amount'     => $price * $qty,
        ]);

        return response()->json($item, 201);
    }

    // PUT /api/v1/order-details/{id}
    public function update(Request $request, int $id)
    {
        $item = OrderDetail::findOrFail($id);

        $data = $request->validate([
            'product_id' => ['sometimes','nullable','integer','min:1'],
            'name'       => ['sometimes','nullable','string','max:191'],
            'price'      => ['sometimes','required','numeric','min:0'],
            'qty'        => ['sometimes','required','integer','min:1'],
            'discount'   => ['sometimes','numeric','min:0'],
        ]);

        $price = array_key_exists('price',$data) ? (float)$data['price'] : (float)$item->price;
        $qty   = array_key_exists('qty',$data)   ? (int)$data['qty']   : (int)$item->qty;

        if (array_key_exists('price',$data) || array_key_exists('qty',$data)) {
            $data['amount'] = $price * $qty;
        }

        $item->fill($data)->save();
        return response()->json($item);
    }

    // DELETE /api/v1/order-details/{id}
    public function destroy(int $id)
    {
        OrderDetail::where('id', $id)->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
