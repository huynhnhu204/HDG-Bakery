<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CustomerController extends Controller
{
    /* ===================== ADMIN LIST / FILTER ===================== */
    public function index(Request $r)
    {
        // Model có SoftDeletes + có cột deleted_at => scope mặc định đã loại bản ghi bị xóa mềm.
        $q = Customer::query()
            ->when($r->query('q'), fn($qb,$q)=>$qb->where(function($w) use ($q){
                $w->where('name','like',"%$q%")
                  ->orWhere('email','like',"%$q%")
                  ->orWhere('phone','like',"%$q%");
            }))
            ->when($r->query('group'), fn($qb,$g)=>$qb->where('group',$g))
            ->when($r->query('membership_level'), fn($qb,$lv)=>$qb->where('membership_level',$lv))
            ->when($r->query('vip_level')!==null && $r->query('vip_level')!=='',
                fn($qb,$v)=>$qb->where('vip_level',(int)$v))
            ->when($r->query('status')!==null, fn($qb,$s)=>$qb->where('status',$s))
            ->when($r->query('created_from'), fn($qb,$d)=>$qb->whereDate('created_at','>=',$d))
            ->when($r->query('created_to'), fn($qb,$d)=>$qb->whereDate('created_at','<=',$d))
            ->when($r->query('province'), fn($qb,$p)=>$qb->where('address','like',"%$p%"))
            ->orderByDesc('id');

        return response()->json($q->paginate((int)$r->query('per_page',20)));
    }

    /* ===================== ADMIN VIEW ONE ===================== */
    public function show($id)
    {
        $c = Customer::findOrFail($id);
        try {
            // đảm bảo "Tổng đơn" và "Tổng chi" luôn đúng tại thời điểm xem
            $c->recomputeMembership('amount', 'lifetime');
        } catch (\Throwable $e) {
            // ignore
        }
        return response()->json($c);
    }

    /* ===================== CUSTOMER (self) ===================== */
    public function me(Request $r)
    {
        // Scope SoftDeletes mặc định sẽ tự loại bản ghi đã xóa mềm
        $c = Customer::where('user_id', $r->user()->id)->firstOrFail();
        return response()->json($c);
    }

    public function updateSelf(Request $r)
    {
        $c = Customer::where('user_id', $r->user()->id)->firstOrFail();

        $data = $r->validate([
            'name'     => 'sometimes|required|string|max:120',
            'phone'    => 'sometimes|nullable|string|max:20',
            'address'  => 'sometimes|nullable|string|max:255',
            'birthday' => 'sometimes|nullable|date',
            'gender'   => 'sometimes|nullable|string|in:male,female,other',
            'email'    => ['sometimes','required','email', Rule::unique('customers','email')->ignore($c->id)],
        ]);

        $c->fill($data);
        $c->updated_by = $r->user()->id ?? null;
        $c->save();

        return response()->json(['message'=>'Cập nhật thành công','customer'=>$c]);
    }

    /* ===================== SEGMENT / VIP / RFM (giữ nguyên logic) ===================== */
    public function recomputeSegments(Request $r)
    {
        $windowDays = max(30, (int)$r->input('window_days', 180));
        $now = Carbon::now();
        $from = $now->clone()->subDays($windowDays);

        $validStatuses = [1,2,3]; // processing, shipped, delivered

        $stats = DB::table('orders as o')
            ->join('order_details as od', 'od.order_id', '=', 'o.id')
            ->select([
                'o.user_id',
                DB::raw('COUNT(DISTINCT o.id) as order_count'),
                DB::raw('SUM(GREATEST(0, COALESCE(od.amount, od.price*od.qty) - COALESCE(od.discount,0))) as total_spent'),
                DB::raw('MAX(o.created_at) as last_order_at'),
            ])
            ->whereIn('o.status', $validStatuses)
            ->where('o.created_at', '>=', $from)
            ->whereNotNull('o.user_id')
            ->groupBy('o.user_id')
            ->get()
            ->keyBy('user_id');

        $scoreR = function($lastAt) use ($now) {
            if (!$lastAt) return 1;
            $days = Carbon::parse($lastAt)->diffInDays($now);
            if ($days <= 15) return 5;
            if ($days <= 30) return 4;
            if ($days <= 60) return 3;
            if ($days <= 120) return 2;
            return 1;
        };
        $scoreF = fn($cnt)=> $cnt>=8?5:($cnt>=6?4:($cnt>=4?3:($cnt>=2?2:1)));
        $scoreM = fn($sum)=> $sum>=8000000?5:($sum>=5000000?4:($sum>=3000000?3:($sum>=1500000?2:1)));

        $vipLevelOf = function($sum, $cnt, $lastAt) use ($now) {
            $days = $lastAt ? Carbon::parse($lastAt)->diffInDays($now) : 9999;
            if ($sum >= 8000000 && $cnt >= 10 && $days <= 45) return 3; // Diamond
            if ($sum >= 5000000 && $cnt >= 6  && $days <= 60) return 2; // Gold
            if ($sum >= 3000000 && $cnt >= 4  && $days <= 60) return 1; // Silver
            return 0;
        };

        $customers = Customer::query()->get(['id','user_id','vip_level','group']);

        $updates = [];
        foreach ($customers as $c) {
            $st = $c->user_id ? ($stats[$c->user_id] ?? null) : null;

            $orderCount  = (int)($st->order_count  ?? 0);
            $totalSpent  = (float)($st->total_spent ?? 0);
            $lastOrderAt = $st->last_order_at ?? null;

            $r = $scoreR($lastOrderAt);
            $f = $scoreF($orderCount);
            $m = $scoreM($totalSpent);

            $vip   = $vipLevelOf($totalSpent, $orderCount, $lastOrderAt);
            $group = $vip >= 1 ? 'VIP' : 'Normal';

            $updates[] = [
                'id'         => $c->id,
                'vip_level'  => $vip,
                'group'      => $group,
                'level'      => "{$r}{$f}{$m}",
                'updated_at' => now(),
            ];
        }

        if (!empty($updates)) {
            $ids = array_column($updates, 'id');

            $caseVip   = 'CASE id ';
            $caseGroup = 'CASE id ';
            $caseLevel = 'CASE id ';
            foreach ($updates as $u) {
                $id = (int)$u['id'];
                $caseVip   .= "WHEN {$id} THEN {$u['vip_level']} ";
                $caseGroup .= "WHEN {$id} THEN '".addslashes($u['group'])."' ";
                $caseLevel .= "WHEN {$id} THEN '".addslashes($u['level'])."' ";
            }
            $caseVip   .= 'END';
            $caseGroup .= 'END';
            $caseLevel .= 'END';

            DB::table('customers')
                ->whereIn('id', $ids)
                ->update([
                    'vip_level' => DB::raw($caseVip),
                    'group'     => DB::raw($caseGroup),
                    'level'     => DB::raw($caseLevel),
                    'updated_at'=> now(),
                ]);
        }

        $summary = DB::table('customers')
            ->selectRaw("`group` as grp, vip_level, COUNT(*) as cnt")
            ->groupBy('grp','vip_level')
            ->get();

        return response()->json([
            'message'     => 'Recomputed customer segments',
            'window_days' => $windowDays,
            'summary'     => $summary,
        ]);
    }

    /* ===================== ADMIN CREATE / UPDATE / DELETE ===================== */
    public function store(Request $r)
    {
        $data = $r->validate([
            'name'          => 'required|string|max:120',
            'email'         => ['nullable','email','max:150','unique:customers,email'],
            'phone'         => 'nullable|string|max:20|unique:customers,phone',
            'address'       => 'nullable|string|max:255',
            'birthday'      => 'nullable|date',
            'gender'        => 'nullable|string|in:male,female,other',
            'group'         => 'nullable|string|max:50',
            'source'        => 'nullable|string|max:50',
            'tags'          => 'nullable|string|max:255',
            'owner'         => 'nullable|string|max:100',
            'note'          => 'nullable|string|max:500',
            'points'        => 'nullable|integer|min:0',
            'level'         => 'nullable|string|max:50',
            'benefit_note'  => 'nullable|string|max:500',
            'email_verified'=> 'boolean',
            'allow_email'   => 'boolean',
            'allow_sms'     => 'boolean',
            'consent_note'  => 'nullable|string|max:500',
            'cmnd'          => 'nullable|string|max:100',
            'documents'     => 'nullable|string|max:255',
            'status'        => 'nullable|integer|in:0,1',
            'vip_level'     => 'nullable|integer|min:0|max:10',
        ]);

        $data['created_by'] = $r->user()->id ?? null;

        $c = Customer::create($data);

        return response()->json(['message'=>'Thêm khách hàng thành công','customer'=>$c],201);
    }

    public function adminUpdate(Request $r, $id)
    {
        $c = Customer::findOrFail($id);

        $data = $r->validate([
            'name'          => 'sometimes|required|string|max:120',
            'email'         => ['sometimes','required','email', Rule::unique('customers','email')->ignore($c->id)],
            'phone'         => ['sometimes','nullable','string','max:20', Rule::unique('customers','phone')->ignore($c->id)],
            'address'       => 'sometimes|nullable|string|max:255',
            'birthday'      => 'sometimes|nullable|date',
            'gender'        => 'sometimes|nullable|string|in:male,female,other',
            'group'         => 'sometimes|nullable|string|max:50',
            'source'        => 'sometimes|nullable|string|max:50',
            'tags'          => 'sometimes|nullable|string|max:255',
            'owner'         => 'sometimes|nullable|string|max:100',
            'note'          => 'sometimes|nullable|string|max:500',
            'points'        => 'sometimes|integer|min:0',
            'level'         => 'sometimes|nullable|string|max:50',
            'benefit_note'  => 'sometimes|nullable|string|max:500',
            'email_verified'=> 'boolean',
            'allow_email'   => 'boolean',
            'allow_sms'     => 'boolean',
            'consent_note'  => 'nullable|string|max:500',
            'cmnd'          => 'sometimes|nullable|string|max:100',
            'documents'     => 'sometimes|nullable|string|max:255',
            'vip_level'     => 'sometimes|integer|min:0|max:10',
            'status'        => 'sometimes|integer|in:0,1',
            // membership manual adjustments (optional)
            'membership_level'       => 'sometimes|nullable|string|in:dong,bac,vang,bachkim',
            'membership_label'       => 'sometimes|nullable|string|max:50',
            'total_orders'           => 'sometimes|nullable|integer|min:0',
            'total_spent'            => 'sometimes|nullable|integer|min:0',
            'membership_changed_at'  => 'sometimes|nullable|date',
        ]);

        $c->fill($data);
        $c->updated_by = $r->user()->id ?? null;
        $c->save();

        return response()->json(['message'=>'Admin cập nhật thành công','customer'=>$c]);
    }

    public function destroy($id)
    {
        // Soft delete chuẩn
        $c = Customer::findOrFail($id);
        $c->delete();

        return response()->json(['message'=>'Xoá khách hàng thành công']);
    }

    public function toggleStatus($id)
    {
        $c = Customer::findOrFail($id);
        $c->status = $c->status ? 0 : 1;
        $c->save();
        return response()->json(['message'=>'Đã cập nhật trạng thái','status'=>$c->status]);
    }
}
