<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\{StockIn, StockInItem, ProductStore};

class StockInController extends Controller
{
    // GET /api/v1/stock-ins
    // ?q=&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&per_page=20&page=1
    public function index(Request $r)
    {
        $per = max(1, (int)$r->query('per_page', 20));

        $q = StockIn::query()
            ->when($r->query('q'), function ($qb, $v) {
                $v = trim($v);
                $qb->where(function ($w) use ($v) {
                    $w->where('code', 'like', "%$v%")
                      ->orWhere('supplier', 'like', "%$v%")
                      ->orWhere('note', 'like', "%$v%");
                });
            })
            ->when($r->query('status') !== null, fn($qb, $v) => $qb->where('status', (int)$v))
            ->when($r->query('warehouse'), fn($qb, $v) => $qb->where('warehouse', $v))
            ->when($r->query('date_from'), fn($qb,$d)=>$qb->whereDate('date','>=',$d))
            ->when($r->query('date_to'),   fn($qb,$d)=>$qb->whereDate('date','<=',$d))
            ->orderBy('date','desc')
            ->orderBy('id','desc');

        $data = $q->paginate($per);
        
        // Load items cho mỗi stock-in để hiển thị thông tin đầy đủ
        $data->getCollection()->transform(function ($stockIn) {
            $stockIn->load('items.product');
            return $stockIn;
        });
        
        return response()->json($data);
    }

    // GET /api/v1/stock-ins/{id}
    public function show(int $id)
    {
        $stockIn = StockIn::with(['items.product'])->findOrFail($id);
        return response()->json($stockIn);
    }

    // POST /api/v1/stock-ins
    // Body: { date: 'YYYY-MM-DD', supplier?:string, note?:string, items: [{product_id, qty, price}] }
    public function store(Request $r)
    {
        $data = $r->validate([
            'date'              => ['required','date'],
            'supplier'          => ['nullable','string','max:255'],
            'warehouse'         => ['nullable','string','max:100'],
            'note'              => ['nullable','string','max:1000'],
            'status'            => ['nullable','integer','in:0,1'],
            'items'             => ['required','array','min:1'],
            'items.*.product_id'=> ['required','integer','min:1'],
            'items.*.qty'       => ['required','integer','min:1'],
            'items.*.price'     => ['required','numeric','min:0'],
        ]);

        $uid = auth()->id() ?? 1;

        return DB::transaction(function () use ($data,$uid) {
            // Tạo header
            $stockIn = new StockIn();
            $stockIn->code        = $this->makeCode();
            $stockIn->date        = $data['date'];
            $stockIn->supplier    = $data['supplier'] ?? null;
            $stockIn->warehouse   = $data['warehouse'] ?? null;
            $stockIn->note        = $data['note'] ?? null;
            $stockIn->total_qty   = 0;
            $stockIn->total_cost  = 0;
            $stockIn->status      = $data['status'] ?? 0;
            $stockIn->created_by  = $uid;
            $stockIn->save();

            $totalQty = 0;
            $totalAmt = 0;
            $now      = now();

            $rowsPS = []; // batch insert cho bảng product_store
            foreach ($data['items'] as $it) {
                $qty   = (int)$it['qty'];
                $price = (float)$it['price'];
                $amt   = $qty * $price;

                // Lưu dòng chi tiết
                $item = new StockInItem();
                $item->stock_in_id = $stockIn->id;
                $item->product_id  = (int)$it['product_id'];
                $item->qty         = $qty;
                $item->price       = $price;
                $item->amount      = $amt;
                $item->save();

                $totalQty += $qty;
                $totalAmt += $amt;

                // Ghi vào product_store (lịch sử nhập) - chỉ khi status = 1 (đã xác nhận)
                if (($data['status'] ?? 0) === 1) {
                    $rowsPS[] = [
                        'product_id' => (int)$it['product_id'],
                        'price_root' => $price,
                        'qty'        => $qty,
                        'type'       => 'IN',
                        'ref_type'   => 'stock_ins',
                        'ref_id'     => $stockIn->id,
                        'note'       => 'StockIn '.$stockIn->code,
                        'status'     => 1,
                        'created_at' => $now,
                        'created_by' => $uid,
                    ];
                }
            }

            if (!empty($rowsPS)) {
                ProductStore::insert($rowsPS);
            }

            $stockIn->total_qty  = $totalQty;
            $stockIn->total_cost = $totalAmt;
            $stockIn->save();

            return response()->json($stockIn->load('items'), 201);
        });
    }

    // POST /api/v1/stock-ins/{id}/confirm - Xác nhận phiếu nhập
    public function confirm(int $id)
    {
        return DB::transaction(function () use ($id) {
            $stockIn = StockIn::with('items')->findOrFail($id);
            
            if ($stockIn->status === 1) {
                return response()->json(['message' => 'Phiếu đã được xác nhận rồi'], 422);
            }
            
            // Lấy các dòng hàng
            $items = $stockIn->items;
            
            // Cập nhật tồn kho cho từng sản phẩm
            foreach ($items as $item) {
                $product = \App\Models\Product::find($item->product_id);
                if ($product) {
                    // Tăng số lượng trong kho
                    $product->quantity = ($product->quantity ?? 0) + $item->qty;
                    $product->save();

                    // Ghi vào lịch sử product_store nếu chưa có
                    $existing = ProductStore::where('ref_type', 'stock_ins')
                        ->where('ref_id', $stockIn->id)
                        ->where('product_id', $item->product_id)
                        ->first();

                    if (!$existing) {
                        ProductStore::create([
                            'product_id' => $item->product_id,
                            'price_root' => $item->price,
                            'qty'        => $item->qty,
                            'type'       => 'IN',
                            'ref_type'   => 'stock_ins',
                            'ref_id'     => $stockIn->id,
                            'note'       => 'Confirmed StockIn ' . $stockIn->code,
                            'status'     => 1,
                            'created_at' => now(),
                            'created_by' => auth()->id() ?? 1,
                        ]);
                    }
                }
            }
            
            // Cập nhật trạng thái phiếu
            $stockIn->status       = 1;
            $stockIn->confirmed_by = auth()->id() ?? 1;
            $stockIn->confirmed_at = now();
            $stockIn->save();
            
            return response()->json(['message' => 'Confirmed', 'stockIn' => $stockIn]);
        });
    }

    // DELETE /api/v1/stock-ins/{id}
    public function destroy(int $id)
    {
        return DB::transaction(function () use ($id) {
            $stockIn = StockIn::findOrFail($id);

            // Xoá các dòng history liên quan (product_store) – soft theo logic bạn đang dùng (status)
            ProductStore::where('ref_type','stock_ins')
                ->where('ref_id',$stockIn->id)
                ->update([
                    'status'     => 0,
                    'updated_at' => now(),
                    'updated_by' => auth()->id() ?? 1,
                ]);

            // Có thể xoá cứng items + header, hoặc tuỳ chính sách của bạn
            StockInItem::where('stock_in_id', $stockIn->id)->delete();
            $stockIn->delete();

            return response()->json(['message'=>'Deleted']);
        });
    }

    // POST /api/v1/stock-ins/import  (multipart/form-data)
    // CSV header: product_id,qty,price
    public function import(Request $r)
    {
        $data = $r->validate([
            'date'     => ['required','date'],
            'supplier' => ['nullable','string','max:255'],
            'note'     => ['nullable','string','max:1000'],
            'file'     => ['required','file','mimetypes:text/plain,text/csv,text/tsv,text/plain; charset=UTF-8','max:2048'],
        ]);

        $uid = auth()->id() ?? 1;

        $rows = [];
        if (($handle = fopen($r->file('file')->getRealPath(), 'r')) !== false) {
            $header = fgetcsv($handle);
            if (!$header) return response()->json(['message'=>'CSV trống hoặc sai định dạng'], 422);

            // Chuẩn hóa header
            $map = array_map(fn($x)=>strtolower(trim($x)), $header);
            $idxPid = array_search('product_id', $map);
            $idxQty = array_search('qty', $map);
            $idxPri = array_search('price', $map);
            if ($idxPid === false || $idxQty === false || $idxPri === false) {
                return response()->json(['message'=>'Thiếu cột product_id/qty/price'], 422);
            }

            while (($cols = fgetcsv($handle)) !== false) {
                if (!isset($cols[$idxPid], $cols[$idxQty], $cols[$idxPri])) continue;
                $pid = (int)$cols[$idxPid];
                $qty = (int)$cols[$idxQty];
                $pri = (float)$cols[$idxPri];
                if ($pid>0 && $qty>0 && $pri>=0) {
                    $rows[] = ['product_id'=>$pid,'qty'=>$qty,'price'=>$pri];
                }
            }
            fclose($handle);
        }

        if (empty($rows)) return response()->json(['message'=>'Không có dòng hợp lệ'], 422);

        // Dùng lại logic store()
        $req = new Request([
            'date'   => $data['date'],
            'supplier' => $data['supplier'] ?? null,
            'note'   => $data['note'] ?? null,
            'items'  => $rows,
        ]);
        return $this->store($req);
    }

    private function makeCode(): string
    {
        // Ví dụ: SI-202410-000123
        $prefix = 'SI-'.now()->format('Ym').'-';
        $last   = StockIn::where('code','like',$prefix.'%')->max('code');
        $num    = 0;
        if ($last && preg_match('/^'.preg_quote($prefix,'/').'(\d{6})$/', $last, $m)) {
            $num = (int)$m[1];
        }
        return $prefix.str_pad((string)($num+1), 6, '0', STR_PAD_LEFT);
    }
}
