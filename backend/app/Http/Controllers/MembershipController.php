<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;

class MembershipController extends Controller
{
    // GET /api/v1/membership/me (auth)
    public function me(Request $r)
    {
        try {
            $user = $r->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
            
            // Tìm hoặc tạo Customer record
            $customer = Customer::where('user_id', $user->id)->first();
            if (!$customer) {
                // Tự động tạo Customer từ User nếu chưa có
                $customer = Customer::create([
                    'user_id' => $user->id,
                    'name' => $user->name ?? '',
                    'email' => $user->email ?? '',
                    'phone' => '',
                    'address' => null,
                    'status' => 1,
                    'membership_level' => 'dong',
                    'membership_label' => 'Đồng',
                    'total_orders' => 0,
                    'total_spent' => 0,
                ]);
                \Log::info('Auto-created Customer for user', [
                    'user_id' => $user->id,
                    'customer_id' => $customer->id,
                ]);
            }

            // Ensure up-to-date (lifetime amount by default)
            // Tính lại từ tất cả đơn có status = 3 (delivered)
            try {
                $customer->recomputeMembership('amount', 'lifetime');
                // Refresh để lấy giá trị mới nhất
                $customer->refresh();
                \Log::info('Membership recomputed for user', [
                    'user_id' => $user->id,
                    'customer_id' => $customer->id,
                    'total_orders' => $customer->total_orders,
                    'total_spent' => $customer->total_spent,
                    'membership_level' => $customer->membership_level,
                ]);
            } catch (\Throwable $e) {
                \Log::warning('MembershipController::me - recomputeMembership failed: ' . $e->getMessage(), [
                    'user_id' => $user->id,
                    'customer_id' => $customer->id,
                    'trace' => $e->getTraceAsString(),
                ]);
                // Continue with existing values if recompute fails
            }

            $tiers = $this->tiers();
            $currentIndex = 0;
            foreach ($tiers as $i=>$t) { 
                if ($t['key'] === ($customer->membership_level ?: 'dong')) { 
                    $currentIndex = $i; 
                    break; 
                } 
            }
            $next = $tiers[min($currentIndex+1, count($tiers)-1)];

            $criterion = 'amount';
            $currentValue = $criterion==='orders' ? (int)$customer->total_orders : (int)$customer->total_spent;
            $currTierMin = $tiers[$currentIndex]['min'];
            $nextMin     = $next['min'];
            $denom = max(1, $nextMin - $currTierMin);
            $num = max(0, min($denom, $currentValue - $currTierMin));
            $percent = (int) floor($num * 100 / $denom);
            $remaining = max(0, $nextMin - $currentValue);

            return response()->json([
                'level' => $customer->membership_level ?: 'dong',
                'label' => $customer->membership_label ?: 'Đồng',
                'total_orders' => (int)($customer->total_orders ?? 0),
                'total_spent'  => (int)($customer->total_spent  ?? 0),
                'changed_at'   => $customer->membership_changed_at,
                'progress' => [
                    'to'        => $next['key'],
                    'to_label'  => $next['label'],
                    'percent'   => $percent,
                    'remaining' => $remaining,
                ],
                'benefits' => $this->benefitsFor($customer->membership_level ?: 'dong'),
            ]);
        } catch (\Throwable $e) {
            \Log::error('MembershipController::me error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => $r->user()?->id,
            ]);
            return response()->json([
                'message' => 'Lỗi khi lấy thông tin membership: ' . $e->getMessage(),
                'level' => 'dong',
                'label' => 'Đồng',
                'total_orders' => 0,
                'total_spent' => 0,
                'progress' => [ 'to' => 'bac', 'to_label' => 'Bạc', 'percent' => 0, 'remaining' => 0 ],
                'benefits' => $this->benefitsFor('dong'),
            ], 500);
        }
    }

    // GET /api/v1/membership/tiers
    public function tiersPublic()
    {
        return response()->json($this->tiers());
    }

    private function tiers(): array
    {
        // Default tiers by total spending (VND)
        return [
            ['key'=>'dong',    'label'=>'Đồng',     'min'=>0,         'discount'=>0],
            ['key'=>'bac',     'label'=>'Bạc',      'min'=>1_000_000, 'discount'=>5],
            ['key'=>'vang',    'label'=>'Vàng',     'min'=>3_000_000, 'discount'=>10],
            ['key'=>'bachkim', 'label'=>'Bạch Kim', 'min'=>7_000_000, 'discount'=>12],
        ];
    }

    private function benefitsFor(string $key): array
    {
        switch ($key) {
            case 'bachkim':
                return ['Giảm 12% bánh & đồ uống', 'Freeship nội quận cao', 'Ưu tiên đặt bánh sinh nhật', 'Tặng nến/thiệp miễn phí'];
            case 'vang':
                return ['Giảm 10% bánh & đồ uống', 'Freeship nội quận (tối đa 20k)', 'Quà sinh nhật nhỏ'];
            case 'bac':
                return ['Giảm 5% bánh & đồ uống', 'Ưu tiên chat hỗ trợ'];
            default:
                return ['Tích luỹ để nhận ưu đãi cao hơn'];
        }
    }
}












