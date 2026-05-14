<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $now  = Carbon::now();
        $rows = [];

        // Lấy tất cả category_id hiện có (bảng của bạn là "category")
        $categories = DB::table('category')->pluck('id');

        // Tham số
        $perCategory = 5; // số sản phẩm mỗi danh mục
        $units       = ['cái','hộp','bịch','set'];
        $types       = ['Bánh kem','Bánh ngọt','Bánh quy','Mousse'];
        $weights     = ['4 inch','6 inch','8 inch','1 tầng','500g','1kg'];

        // Pool dữ liệu
        $flavorPool = ['Dâu','Vanilla','Socola','Matcha','Phô mai','Caramel','Tiramisu'];
        $ingPool    = ['bột mì','trứng','đường','sữa','bơ','hạnh nhân','dâu tây','sốt kem'];
        $tagPool    = ['Sinh nhật','Không trứng','Trà chiều','Ăn kiêng','Ít đường'];

        // Hàm pick tối ưu: shuffle + slice (không lỗi khi n=1)
        $pick = function (array $pool, int $n): array {
            $n = max(0, min($n, count($pool)));
            if ($n === 0) return [];
            $copy = $pool;
            shuffle($copy);
            return array_values(array_slice($copy, 0, $n));
        };

        foreach ($categories as $catId) {
            for ($i = 1; $i <= $perCategory; $i++) {
                $name  = "Sản phẩm $i của Danh mục $catId";
                $slug  = Str::slug($name) . '-' . $catId . '-' . Str::lower(Str::random(4));
                $thumb = "/uploads/products/product{$catId}_{$i}.jpg";
                $image = $thumb;

                // Giá & sale
                $priceBuy  = random_int(80_000, 450_000);
                $hasSale   = (bool) random_int(0, 1); // 50%
                $salePct   = $hasSale ? random_int(5, 25) : 0;
                $priceSale = $hasSale ? (int) (round($priceBuy * (100 - $salePct) / 1000) * 1000) : null;

                // Kênh + nutrition
                $channels  = (random_int(0, 1)) ? ['pickup','delivery'] : ['pickup'];
                $nutrition = [
                    'vegan'         => (bool) (random_int(0, 1) && random_int(0, 1)),
                    'glutenFree'    => (bool) (random_int(0, 1) && random_int(0, 1)),
                    'containsNuts'  => (bool) random_int(0, 1),
                    'containsDairy' => (bool) random_int(0, 1),
                ];

                // Meta đúng với UI/backend hiện tại
                $meta = [
                    'sku'            => 'SKU-' . strtoupper(Str::random(6)),
                    'availableFrom'  => $now->copy()->subDays(random_int(0, 15))->toDateString(),
                    'bestBeforeDays' => random_int(1, 5),
                    'flavors'        => $pick($flavorPool, random_int(1, 3)),
                    'ingredients'    => $pick($ingPool,    random_int(3, 6)),
                    'channels'       => $channels,
                    'nutrition'      => $nutrition,
                    'tags'           => $pick($tagPool,    random_int(1, 3)),
                    'weightGram'     => random_int(300, 1200),
                ];

                $html        = "<p>Mô tả chi tiết <strong>{$name}</strong>. Thành phần và hương vị tùy chọn.</p>";
                $contentJson = json_encode(['html' => $html, 'meta' => $meta], JSON_UNESCAPED_UNICODE);

                $rows[] = [
                    'category_id'       => $catId,
                    'name'              => $name,
                    'slug'              => $slug,
                    'thumbnail'         => $thumb,
                    'image'             => $image,
                    'content'           => $contentJson,
                    'description'       => "Mô tả ngắn: {$name}",
                    'price_buy'         => $priceBuy,
                    'price_sale'        => $priceSale,
                    'discount_percent'  => $hasSale ? $salePct : null,
                    'quantity'          => random_int(5, 50),
                    'unit'              => $units[array_rand($units)],
                    'type'              => $types[array_rand($types)],
                    'weight'            => $weights[array_rand($weights)],
                    'product_new'       => (bool) random_int(0, 1),
                    'status'            => 1,
                    'created_by'        => 1,
                    'updated_by'        => null,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ];
            }
        }

        if (empty($rows)) {
            $this->command?->warn('Không có category nào để seed product.');
            return;
        }

        // Bảng của bạn là "product"
        DB::table('product')->upsert(
            $rows,
            ['slug'], // tránh trùng theo slug
            [
                'name','thumbnail','image','content','description',
                'price_buy','price_sale','discount_percent',
                'quantity','unit','type','weight','product_new','status',
                'updated_at'
            ]
        );

        $this->command?->info('Seeded products (content.meta + sale) xong!');
    }
}
