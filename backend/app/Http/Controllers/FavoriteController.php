<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use App\Models\Product;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $r)
    {
        $user = $r->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $favorites = Favorite::where('user_id', $user->id)
            ->with('product:id,name,price_buy,thumbnail,slug')
            ->paginate(20);
        
        // Thêm effective_price và product_sale vào response
        $favorites->getCollection()->transform(function($fav) {
            if ($fav->product) {
                $fav->product->effective_price = $fav->product->effective_price;
                $fav->product->price = $fav->product->effective_price;
            }
            return $fav;
        });

        return response()->json($favorites);
    }

    public function toggle(Request $r)
    {
        $user = $r->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $productId = $r->input('product_id');
        if (!$productId) {
            return response()->json(['message' => 'product_id required'], 400);
        }

        $product = Product::find($productId);
        if (!$product) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $favorite = Favorite::where('user_id', $user->id)
            ->where('product_id', $productId)
            ->first();

        if ($favorite) {
            $favorite->delete();
            return response()->json(['message' => 'Removed from favorites', 'is_favorite' => false]);
        } else {
            Favorite::create([
                'user_id' => $user->id,
                'product_id' => $productId,
            ]);
            return response()->json(['message' => 'Added to favorites', 'is_favorite' => true]);
        }
    }

    public function check(Request $r)
    {
        $user = $r->user();
        if (!$user) {
            return response()->json(['is_favorite' => false]);
        }

        $productIds = $r->input('product_ids', []);
        if (empty($productIds)) {
            return response()->json(['favorites' => []]);
        }

        $favorites = Favorite::where('user_id', $user->id)
            ->whereIn('product_id', $productIds)
            ->pluck('product_id')
            ->toArray();

        return response()->json(['favorites' => $favorites]);
    }
}


