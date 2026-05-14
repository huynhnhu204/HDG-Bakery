<?php

namespace App\Http\Controllers;

use App\Models\ProductStore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductStoreController extends Controller
{
    // GET /api/v1/product-store
    // ?product_id=&status=&type=&ref_type=&ref_id=&q=&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    // ?per_page=20&page=1&sort=created_desc (created_asc|price_asc|price_desc|qty_desc)
    public function index(Request $r)
    {
        $per  = max(1, (int)$r->query('per_page', 20));
        $sort = $r->query('sort', 'created_desc');

        $q = ProductStore::query()
            ->when($r->query('product_id'), fn($qb, $v) => $qb->where('product_id', (int)$v))
            ->when($r->query('status') !== null, fn($qb, $v) => $qb->where('status', (int)$v))
            ->when($r->query('type'), fn($qb, $v) => $qb->where('type', $v))
            ->when($r->query('ref_type'), fn($qb, $v) => $qb->where('ref_type', $v))
            ->when($r->query('ref_id'), fn($qb, $v) => $qb->where('ref_id', (int)$v))
            ->when($r->query('q'), fn($qb, $v) => $qb->where('note', 'like', "%$v%"))
            ->when($r->query('date_from'), fn($qb, $d) => $qb->whereDate('created_at', '>=', $d))
            ->when($r->query('date_to'), fn($qb, $d) => $qb->whereDate('created_at', '<=', $d));

        switch ($sort) {
            case 'created_asc': $q->orderBy('created_at', 'asc'); break;
            case 'price_asc':   $q->orderBy('price_root', 'asc'); break;
            case 'price_desc':  $q->orderBy('price_root', 'desc'); break;
            case 'qty_desc':    $q->orderBy('qty', 'desc'); break;
            default:            $q->orderBy('created_at', 'desc'); // created_desc
        }

        return response()->json($q->paginate($per));
    }

    public function show(int $id)
    {
        return response()->json(ProductStore::findOrFail($id));
    }

    // POST /api/v1/product-store (tạo 1 dòng)
    public function store(Request $r)
    {
        $data = $r->validate([
            'product_id' => ['required','integer','min:1'],
            'price_root' => ['required','numeric','min:0'],
            'qty'        => ['required','integer','min:0'],
            'type'       => ['nullable','string','max:30'],
            'ref_type'   => ['nullable','string','max:30'],
            'ref_id'     => ['nullable','integer','min:0'],
            'note'       => ['nullable','string','max:500'],
            'status'     => ['nullable','integer','in:0,1'],
        ]);

        $data['price_root'] = (float)$data['price_root'];
        $data['qty']        = (int)$data['qty'];
        $data['created_at'] = now();
        $data['created_by'] = auth()->id() ?? 1;
        $data['status']     = $data['status'] ?? 1;

        $item = ProductStore::create($data);
        return response()->json($item, 201);
    }

    // POST /api/v1/product-store/bulk (alias cũ -> dùng storeMany)
    public function bulkStore(Request $r) { return $this->storeMany($r); }

    // POST /api/v1/stocks (hoặc /product-store) — tạo nhiều dòng 1 lượt
    // body: { items: [{product_id,price_root,qty,type?,ref_type?,ref_id?,note?}, ...], status? }
    public function storeMany(Request $r)
    {
        $payload = $r->validate([
            'items'               => ['required','array','min:1'],
            'items.*.product_id'  => ['required','integer','min:1'],
            'items.*.price_root'  => ['required','numeric','min:0'],
            'items.*.qty'         => ['required','integer','min:1'],
            'items.*.type'        => ['nullable','string','max:30'],
            'items.*.ref_type'    => ['nullable','string','max:30'],
            'items.*.ref_id'      => ['nullable','integer','min:0'],
            'items.*.note'        => ['nullable','string','max:500'],
            'status'              => ['nullable','integer','in:0,1'],
        ]);

        $uid   = auth()->id() ?? 1;
        $now   = now();
        $state = $payload['status'] ?? 1;

        $rows = array_map(function ($x) use ($uid, $now, $state) {
            return [
                'product_id' => (int)$x['product_id'],
                'price_root' => (float)$x['price_root'],
                'qty'        => (int)$x['qty'],
                'type'       => $x['type'] ?? null,
                'ref_type'   => $x['ref_type'] ?? null,
                'ref_id'     => $x['ref_id'] ?? null,
                'note'       => $x['note'] ?? null,
                'status'     => $state,
                'created_at' => $now,
                'created_by' => $uid,
            ];
        }, $payload['items']);

        DB::transaction(function () use ($rows) {
            ProductStore::insert($rows);
        });

        return response()->json(['message' => 'Created', 'count' => count($rows)], 201);
    }

    public function update(Request $r, int $id)
    {
        $item = ProductStore::findOrFail($id);

        $data = $r->validate([
            'product_id' => ['sometimes','required','integer','min:1'],
            'price_root' => ['sometimes','required','numeric','min:0'],
            'qty'        => ['sometimes','required','integer','min:0'],
            'type'       => ['sometimes','nullable','string','max:30'],
            'ref_type'   => ['sometimes','nullable','string','max:30'],
            'ref_id'     => ['sometimes','nullable','integer','min:0'],
            'note'       => ['sometimes','nullable','string','max:500'],
            'status'     => ['sometimes','integer','in:0,1'],
        ]);

        if (array_key_exists('price_root', $data)) $data['price_root'] = (float)$data['price_root'];
        if (array_key_exists('qty', $data))        $data['qty']        = (int)$data['qty'];

        $data['updated_at'] = now();
        $data['updated_by'] = auth()->id() ?? 1;

        $item->fill($data)->save();
        return response()->json($item);
    }

    // DELETE /api/v1/product-store/{id} — Xoá mềm: status=0
    public function destroy(int $id)
    {
        $item = ProductStore::findOrFail($id);
        $item->status     = 0;
        $item->updated_at = now();
        $item->updated_by = auth()->id() ?? 1;
        $item->save();

        return response()->json(['message' => 'Disabled (status=0)']);
    }

    // POST /api/v1/product-store/{id}/restore — Khôi phục
    public function restore(int $id)
    {
        $item = ProductStore::findOrFail($id);
        $item->status     = 1;
        $item->updated_at = now();
        $item->updated_by = auth()->id() ?? 1;
        $item->save();

        return response()->json(['message' => 'Restored']);
    }

    // POST /api/v1/product-store/{id}/adjust — { qty_delta: -3 }
    public function adjustQty(Request $r, int $id)
    {
        $item = ProductStore::findOrFail($id);
        $data = $r->validate(['qty_delta' => ['required','integer']]);

        $new = (int)$item->qty + (int)$data['qty_delta'];
        if ($new < 0) return response()->json(['message' => 'Số lượng không thể âm'], 422);

        $item->qty        = $new;
        $item->updated_at = now();
        $item->updated_by = auth()->id() ?? 1;
        $item->save();

        return response()->json($item);
    }
}
