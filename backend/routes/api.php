<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    AuthController, AdminAuthController,
    CustomerController, ProductController, ProductImageController,
    ProductStoreController, ProductSaleController,
    CategoryController, PostController, BannerController,
    OrderController, OrderDetailController, ContactController,
    TopicController, MenuController, SettingController, StorageController,
    StockInController, LookupController, FavoriteController, CouponController,
    CommentController
};
use App\Http\Controllers\ReviewController;

/**
 * Mọi API đặt dưới prefix: /api/v1
 * FE gọi: http://127.0.0.1:8000/api/v1/...
 */
Route::prefix('v1')->group(function () {

    /* ===================== HEALTH CHECK ===================== */
    Route::get('/health', fn () => response()->json([
        'ok'   => true,
        'time' => now()->toDateTimeString(),
    ]));

    /* ===================== CART (session-based) ===================== */
    // Dùng session trong api.php => cần 'web' để session hoạt động
    Route::middleware('web')->group(function () {
        // Tắt CSRF cho các API giỏ hàng dựa trên session để FE (khác origin) gọi được
        $noCsrf = \App\Http\Middleware\VerifyCsrfToken::class;
        Route::get   ('/cart',            [OrderController::class, 'cartIndex']);
        Route::post  ('/cart/add',        [OrderController::class, 'cartAdd'])->withoutMiddleware($noCsrf);
        Route::put   ('/cart/update',     [OrderController::class, 'cartUpdate'])->withoutMiddleware($noCsrf);
        Route::delete('/cart/items/{id}', [OrderController::class, 'cartRemove'])->whereNumber('id')->withoutMiddleware($noCsrf);
        Route::post  ('/cart/clear',      [OrderController::class, 'cartClear'])->withoutMiddleware($noCsrf);
    });

    /* ===================== USER AUTH (PUBLIC) ===================== */
    Route::post('auth/register',      [AuthController::class, 'register']);
    Route::post('auth/login',         [AuthController::class, 'login']);
    Route::post('auth/google',        [AuthController::class, 'googleLogin']);
    Route::get ('auth/verify',        [AuthController::class, 'verifyEmail'])->name('auth.verify');
    Route::post('auth/resend-verify', [AuthController::class, 'resendVerify']);
    Route::post('auth/verify-otp',    [AuthController::class, 'verifyOtp']);
    Route::post('auth/resend-otp',    [AuthController::class, 'resendOtp']);
    
    // Password reset flow
    Route::post('auth/forgot-password',      [AuthController::class, 'forgotPassword']);
    Route::post('auth/verify-otp-for-reset', [AuthController::class, 'verifyOtpForReset']);
    Route::post('auth/reset-password',       [AuthController::class, 'resetPassword']);

    /* ===================== ADMIN AUTH (PUBLIC) ===================== */
    // Để public để admin đăng nhập lấy token admin
    Route::post('admin/login', [AdminAuthController::class, 'login']);

    /* ===================== USER AUTHENTICATED ===================== */
    Route::middleware('auth:sanctum')->group(function () {
        Route::get ('auth/me',               [AuthController::class, 'me']);
        Route::post('auth/logout',           [AuthController::class, 'logout']);
        Route::put ('auth/profile',          [AuthController::class, 'updateProfile']);
        Route::post('auth/change-password',  [AuthController::class, 'changePassword']);

        // Customers: self
        Route::get ('customers/me', [CustomerController::class, 'me']);
        Route::put ('customers/me', [CustomerController::class, 'updateSelf']);

        // ===== Membership =====
        Route::get ('membership/me', [\App\Http\Controllers\MembershipController::class, 'me']);

        // ===== My Orders (dùng trong trang /profile) =====
       Route::get ('orders/my', [OrderController::class, 'myOrders']);
       Route::get ('orders/my/{id}', [OrderController::class, 'myOrderDetail'])->whereNumber('id');
    Route::post('orders/my/{id}/cancel', [OrderController::class, 'cancelMine'])->whereNumber('id');

        // ===== Favorites =====
        Route::get   ('favorites', [FavoriteController::class, 'index']);
        Route::post  ('favorites/toggle', [FavoriteController::class, 'toggle']);
        Route::post  ('favorites/check', [FavoriteController::class, 'check']);
    });

    /* ===================== BACKOFFICE AUTHENTICATED (admin + warehouse) ===================== */
    Route::middleware(['auth:sanctum','ability:admin,warehouse'])->group(function () {
        Route::get ('admin/me',     [AdminAuthController::class, 'me']);
        Route::post('admin/logout', [AdminAuthController::class, 'logout']);

        // ----- Stock-in / kho -----
        Route::get   ('stock-ins',            [StockInController::class, 'index']);
        Route::get   ('stock-ins/{id}',       [StockInController::class, 'show'])->whereNumber('id');
        Route::post  ('stock-ins',            [StockInController::class, 'store']);
        Route::post  ('stock-ins/{id}/confirm',[StockInController::class, 'confirm'])->whereNumber('id');
        Route::delete('stock-ins/{id}',       [StockInController::class, 'destroy'])->whereNumber('id');
        Route::post  ('stock-ins/import',     [StockInController::class, 'import']);

        // Dòng nhập kho (product_store)
        Route::get   ('stocks',               [ProductStoreController::class, 'index']);
        Route::post  ('stocks',               [ProductStoreController::class, 'storeMany']);
        Route::delete('stocks/{id}',          [ProductStoreController::class, 'destroy'])->whereNumber('id');

        // API cũ cho product_store (nếu còn dùng)
        Route::get   ('product-store',        [ProductStoreController::class, 'index']);
        Route::get   ('product-store/{id}',   [ProductStoreController::class, 'show'])->whereNumber('id');
        Route::post  ('product-store',        [ProductStoreController::class, 'store']);
        Route::match (['put','patch'],'product-store/{id}', [ProductStoreController::class, 'update'])->whereNumber('id');
        Route::delete('product-store/{id}',   [ProductStoreController::class, 'destroy'])->whereNumber('id');
        Route::post  ('product-store/{id}/adjust', [ProductStoreController::class, 'adjustQty'])->whereNumber('id');
    });

    /* ===================== ADMIN AUTHENTICATED (abilities:admin) ===================== */
    Route::middleware(['auth:sanctum','abilities:admin'])->group(function () {
        Route::get ('admin/stats/today',  [AdminAuthController::class, 'todayStats']);
        Route::get ('admin/orders',       [AdminAuthController::class, 'recentOrders']);
        Route::get ('admin/products/top', [AdminAuthController::class, 'topProducts']);

        // Products CRUD (admin)
        Route::post  ('products',                        [ProductController::class, 'store']);
        Route::match (['put','patch'],'products/{id}',   [ProductController::class, 'update'])->whereNumber('id');
        Route::delete('products/{id}',                   [ProductController::class, 'destroy'])->whereNumber('id');

        // Product Images (admin) - Gallery management
        Route::get   ('product-images',                  [ProductImageController::class, 'index']);
        Route::post  ('product-images',                  [ProductImageController::class, 'store']);
        Route::get   ('product-images/{id}',            [ProductImageController::class, 'show'])->whereNumber('id');
        Route::match (['put','patch'],'product-images/{id}', [ProductImageController::class, 'update'])->whereNumber('id');
        Route::delete('product-images/{id}',             [ProductImageController::class, 'destroy'])->whereNumber('id');
        Route::post  ('product-images/{id}/set-primary', [ProductImageController::class, 'setPrimary'])->whereNumber('id');
        Route::post  ('product-images/{id}/toggle-status', [ProductImageController::class, 'toggleStatus'])->whereNumber('id');
        Route::post  ('product-images/sort',            [ProductImageController::class, 'updateSort']);
        Route::post  ('product-images/{id}/restore',    [ProductImageController::class, 'restore'])->whereNumber('id');
        Route::delete('product-images/{id}/purge',       [ProductImageController::class, 'purge'])->whereNumber('id');

        // Lookup tags (admin)
        Route::post('lookups/tags',             [LookupController::class, 'createTag']);
        Route::post('lookups/tags/{id}/toggle', [LookupController::class, 'toggleTag'])->whereNumber('id');

        // Product Sale (admin)
        Route::post  ('product-sale',                    [ProductSaleController::class, 'store']);
        Route::match (['put','patch'], 'product-sale/{id}', [ProductSaleController::class, 'update'])->whereNumber('id');
        Route::delete('product-sale/{id}',               [ProductSaleController::class, 'destroy'])->whereNumber('id');

        // Coupons (admin)
        Route::get   ('coupons',                 [CouponController::class, 'index']);
        Route::post  ('coupons',                 [CouponController::class, 'store']);
        Route::get   ('coupons/{id}',            [CouponController::class, 'show'])->whereNumber('id');
        Route::match (['put','patch'], 'coupons/{id}', [CouponController::class, 'update'])->whereNumber('id');
        Route::delete('coupons/{id}',            [CouponController::class, 'destroy'])->whereNumber('id');

        // Reviews (admin)
        Route::get('reviews', [ReviewController::class, 'adminIndex']);
        Route::post('reviews/{id}/moderate', [ReviewController::class, 'moderate'])->whereNumber('id');
        Route::post('reviews/{id}/reply',    [ReviewController::class, 'reply'])->whereNumber('id');

        // Notifications (admin)
        Route::get('admin/notifications', [\App\Http\Controllers\NotificationController::class, 'index']);
        Route::get('admin/notifications/unread-count', [\App\Http\Controllers\NotificationController::class, 'unreadCount']);
        Route::post('admin/notifications/{id}/read', [\App\Http\Controllers\NotificationController::class, 'markAsRead'])->whereNumber('id');
        Route::post('admin/notifications/read-all', [\App\Http\Controllers\NotificationController::class, 'markAllAsRead']);
    });

    /* ===================== PUBLIC APIs ===================== */

    // ----- Lookups -----
    Route::get('lookups', [LookupController::class, 'index']);

    // ----- Products -----
    Route::get   ('products',               [ProductController::class, 'index']);
    Route::get   ('products/new',           [ProductController::class, 'product_new']);
    Route::get   ('products-new',           [ProductController::class, 'product_new']); // Alias for frontend compatibility
    Route::post  ('products/check-stock',   [ProductController::class, 'checkStock']);
    Route::get   ('products/slug/{slug}',   [ProductController::class, 'showBySlug'])->where('slug','[A-Za-z0-9\-]+');
    Route::get   ('products/{id}',          [ProductController::class, 'show'])->whereNumber('id');

    // ----- Product Images (public) -----
    Route::get   ('product-images',         [ProductImageController::class, 'index']);
    Route::get   ('product-images/{id}',    [ProductImageController::class, 'show'])->whereNumber('id');

    // Products Trash / Restore / Purge
    Route::get   ('products/trash',         [ProductController::class, 'trash']);
    Route::post  ('products/{id}/restore',  [ProductController::class, 'restore'])->whereNumber('id');
    Route::post  ('products/restore',       [ProductController::class, 'bulkRestore']);
    Route::delete('products/{id}/purge',    [ProductController::class, 'purge'])->whereNumber('id');
    Route::delete('products/purge',         [ProductController::class, 'bulkPurge']);

    // ----- Categories -----
    Route::get   ('categories',                 [CategoryController::class, 'index']);
    Route::get   ('categories/tree',            [CategoryController::class, 'tree']);
    Route::post  ('categories',                 [CategoryController::class, 'store']); // cân nhắc admin
    Route::get   ('categories/{id}',            [CategoryController::class, 'show'])->whereNumber('id');
    Route::match (['put','patch'],'categories/{id}', [CategoryController::class, 'update'])->whereNumber('id');
    Route::delete('categories/{id}',            [CategoryController::class, 'destroy'])->whereNumber('id');

    // Categories Trash
    Route::get   ('categories/trash',           [CategoryController::class, 'trash']);
    Route::post  ('categories/{id}/restore',    [CategoryController::class, 'restore'])->whereNumber('id');
    Route::post  ('categories/restore',         [CategoryController::class, 'bulkRestore']);
    Route::delete('categories/{id}/purge',      [CategoryController::class, 'purge'])->whereNumber('id');
    Route::delete('categories/purge',           [CategoryController::class, 'bulkPurge']);

    // ----- Topics -----
    Route::get   ('topics',                      [TopicController::class,'index']);
    Route::get   ('topics/slug/{slug}',          [TopicController::class,'showBySlug'])->where('slug','[A-Za-z0-9\-]+');
    Route::get   ('topics/{id}',                 [TopicController::class,'show'])->whereNumber('id');
    Route::post  ('topics',                      [TopicController::class,'store']); // cân nhắc admin
    Route::match (['put','patch'],'topics/{id}', [TopicController::class,'update'])->whereNumber('id');
    Route::delete('topics/{id}',                 [TopicController::class,'destroy'])->whereNumber('id');

    // Topics Trash / Restore / Purge
    Route::get   ('topics/trash',           [TopicController::class, 'trash']);
    Route::post  ('topics/{id}/restore',    [TopicController::class, 'restore'])->whereNumber('id');
    Route::post  ('topics/restore',         [TopicController::class, 'bulkRestore']);
    Route::delete('topics/{id}/purge',      [TopicController::class, 'purge'])->whereNumber('id');
    Route::delete('topics/purge',           [TopicController::class, 'bulkPurge']);

    // ----- Posts -----
    Route::get   ('posts',                      [PostController::class,'index']);
    Route::get   ('posts/slug/{slug}',          [PostController::class,'showBySlug'])->where('slug','[A-Za-z0-9\-]+');
    Route::get   ('posts/{id}',                 [PostController::class,'show'])->whereNumber('id');
    Route::post  ('posts',                      [PostController::class,'store']); // cân nhắc admin
    Route::match (['put','patch'],'posts/{id}', [PostController::class,'update'])->whereNumber('id');
    Route::delete('posts/{id}',                 [PostController::class,'destroy'])->whereNumber('id');

    // Posts Trash / Restore / Purge
    Route::get   ('posts/trash',           [PostController::class, 'trash']);
    Route::post  ('posts/{id}/restore',    [PostController::class, 'restore'])->whereNumber('id');
    Route::post  ('posts/restore',         [PostController::class, 'bulkRestore']);
    Route::delete('posts/{id}/purge',      [PostController::class, 'purge'])->whereNumber('id');
    Route::delete('posts/purge',           [PostController::class, 'bulkPurge']);

    // ----- Banners -----
    Route::get   ('banners',                [BannerController::class, 'index']);
    Route::post  ('banners',                [BannerController::class, 'store']); // cân nhắc admin
    Route::get   ('banners/{banner}',       [BannerController::class, 'show'])->whereNumber('banner');
    Route::match (['put','patch'],'banners/{banner}', [BannerController::class, 'update'])->whereNumber('banner');
    Route::delete('banners/{banner}',       [BannerController::class, 'destroy'])->whereNumber('banner');

    // Banners Trash / Restore / Purge
    Route::get   ('banners/trash',           [BannerController::class, 'trash']);
    Route::post  ('banners/{banner}/restore', [BannerController::class, 'restore'])->whereNumber('banner');
    Route::post  ('banners/restore',         [BannerController::class, 'bulkRestore']);
    Route::delete('banners/{banner}/purge',   [BannerController::class, 'purge'])->whereNumber('banner');
    Route::delete('banners/purge',           [BannerController::class, 'bulkPurge']);

    // ----- Contacts (public submission) -----
    Route::post  ('contacts', [ContactController::class, 'store']);

    // ----- Comments (public) -----
    Route::get   ('comments', [CommentController::class, 'index']);
    Route::post  ('comments', [CommentController::class, 'store']);
    Route::get   ('comments/{id}', [CommentController::class, 'show'])->whereNumber('id');

    // ----- Menus -----
    Route::get   ('menus',      [MenuController::class, 'index']);
    Route::get   ('menus/tree', [MenuController::class, 'tree']);
    Route::get   ('menus/{id}', [MenuController::class, 'show'])->whereNumber('id');
    Route::post  ('menus',      [MenuController::class, 'store']); // cân nhắc admin
    Route::match (['put','patch'],'menus/{id}', [MenuController::class,'update'])->whereNumber('id');
    Route::delete('menus/{id}', [MenuController::class,'destroy'])->whereNumber('id');

    // Menus Trash / Restore / Purge
    Route::get   ('menus/trash',           [MenuController::class, 'trash']);
    Route::post  ('menus/{id}/restore',    [MenuController::class, 'restore'])->whereNumber('id');
    Route::post  ('menus/restore',         [MenuController::class, 'bulkRestore']);
    Route::delete('menus/{id}/purge',      [MenuController::class, 'purge'])->whereNumber('id');
    Route::delete('menus/purge',           [MenuController::class, 'bulkPurge']);

    // ----- Contact -----
    Route::post  ('contact',            [ContactController::class, 'store']);
    Route::get   ('contacts',           [ContactController::class, 'index']);
    Route::get   ('contacts/{id}',      [ContactController::class, 'show'])->whereNumber('id');
    Route::match (['put','patch'],'contacts/{id}', [ContactController::class, 'update'])->whereNumber('id');
    Route::delete('contacts/{id}',      [ContactController::class, 'destroy'])->whereNumber('id');

    // Contacts Trash / Restore / Purge
    Route::get   ('contacts/trash',         [ContactController::class, 'trash']);
    Route::post  ('contacts/{id}/restore',  [ContactController::class, 'restore'])->whereNumber('id');
    Route::post  ('contacts/restore',       [ContactController::class, 'bulkRestore']);
    Route::delete('contacts/{id}/purge',    [ContactController::class, 'purge'])->whereNumber('id');
    Route::delete('contacts/purge',         [ContactController::class, 'bulkPurge']);

    // ----- Orders (public/admin) -----
    Route::get   ('orders',               [OrderController::class, 'index']);
    Route::post  ('orders',               [OrderController::class, 'store']);      // tạo đơn (chấp nhận user từ token nếu có)
    Route::get   ('orders/{id}',          [OrderController::class, 'show'])->whereNumber('id');
    Route::put   ('orders/{id}',          [OrderController::class, 'update'])->whereNumber('id');
    Route::delete('orders/{id}',          [OrderController::class, 'destroy'])->whereNumber('id'); // soft delete
    Route::post  ('orders/{id}/cancel',   [OrderController::class, 'cancel'])->whereNumber('id');
    Route::get   ('orders/{id}/details',  [OrderController::class, 'details'])->whereNumber('id');

    // Purge theo trạng thái cũ (giữ tương thích nếu nơi khác đang dùng)
    Route::post  ('orders/purge-by-status', [OrderController::class, 'purgeByStatus']);

    // Orders Trash / Restore / Purge (mới)
    Route::get   ('orders/trash',         [OrderController::class, 'trash']);
    Route::post  ('orders/{id}/restore',  [OrderController::class, 'restore'])->whereNumber('id');
    Route::post  ('orders/restore',       [OrderController::class, 'bulkRestore']);     // body: { ids: [] }
    Route::delete('orders/{id}/purge',    [OrderController::class, 'purge'])->whereNumber('id'); // purge 1
    Route::delete('orders/purge',         [OrderController::class, 'bulkPurge']);       // body: { ids: [] }

    // ----- Order details -----
    Route::get   ('order-details',        [OrderDetailController::class, 'index']);
    Route::post  ('order-details',        [OrderDetailController::class, 'store']);
    Route::get   ('order-details/{id}',   [OrderDetailController::class, 'show'])->whereNumber('id');
    Route::match (['put','patch'],'order-details/{id}', [OrderDetailController::class, 'update'])->whereNumber('id');
    Route::delete('order-details/{id}',   [OrderDetailController::class, 'destroy'])->whereNumber('id');

    // ----- Settings -----
    Route::get   ('settings',        [SettingController::class, 'index']);
    Route::post  ('settings',        [SettingController::class, 'store']); // cân nhắc admin
    Route::put   ('settings/{id}',   [SettingController::class, 'update']);
    Route::patch ('settings/{id}',   [SettingController::class, 'update']);

    // ----- Coupons (public) -----
    Route::get ('coupons/public',   [CouponController::class, 'publicList']);
    Route::post('coupons/validate', [CouponController::class, 'validateCode']);

    // Coupons Trash / Restore / Purge
    Route::get   ('coupons/trash',         [CouponController::class, 'trash']);
    Route::post  ('coupons/{id}/restore',  [CouponController::class, 'restore'])->whereNumber('id');
    Route::post  ('coupons/restore',       [CouponController::class, 'bulkRestore']);
    Route::delete('coupons/{id}/purge',    [CouponController::class, 'purge'])->whereNumber('id');
    Route::delete('coupons/purge',         [CouponController::class, 'bulkPurge']);

    // ----- Membership tiers (public view) -----
    Route::get('membership/tiers', [\App\Http\Controllers\MembershipController::class, 'tiersPublic']);

    // ----- Storage proxy (public) -----
    Route::get('storage/{path}', [StorageController::class, 'serve'])->where('path', '.*');
    
    // ----- Storage upload (admin only) -----
    Route::post('storage/upload', [StorageController::class, 'upload'])->middleware('auth:sanctum');

    // ----- Customers -----
    Route::get   ('customers',               [CustomerController::class, 'index']);
    Route::get   ('customers/{id}',          [CustomerController::class, 'show'])->whereNumber('id');
    Route::post  ('customers',               [CustomerController::class, 'store']); // cân nhắc admin
    Route::match (['put','patch'],'customers/{id}', [CustomerController::class, 'adminUpdate'])->whereNumber('id');
    Route::delete('customers/{id}',          [CustomerController::class, 'destroy'])->whereNumber('id');
    Route::post  ('customers/{id}/toggle',   [CustomerController::class, 'toggleStatus'])->whereNumber('id');

    // Customers Trash / Restore / Purge
    Route::get   ('customers/trash',         [CustomerController::class, 'trash']);
    Route::post  ('customers/{id}/restore',  [CustomerController::class, 'restore'])->whereNumber('id');
    Route::post  ('customers/restore',       [CustomerController::class, 'bulkRestore']); // body: { ids: [] }
    Route::delete('customers/{id}/purge',    [CustomerController::class, 'purge'])->whereNumber('id');
    Route::delete('customers/purge',         [CustomerController::class, 'bulkPurge']);   // body: { ids: [] }

    // Product Sale (public GET)
    Route::get('product-sale',                    [ProductSaleController::class, 'index']);
    Route::get('product-sale/{id}',               [ProductSaleController::class, 'show'])->whereNumber('id');
    Route::get('product-sale/active/{productId}', [ProductSaleController::class, 'activeForProduct'])->whereNumber('productId');

    // ----- Reviews (public) -----
    Route::get('reviews/featured', [ReviewController::class, 'featured']);
    Route::get('products/{productId}/reviews', [ReviewController::class, 'index'])->whereNumber('productId');
    Route::post('reviews', [ReviewController::class, 'store']);
    Route::post('reviews/{id}/helpful', [ReviewController::class, 'helpful'])->whereNumber('id');
    Route::post('reviews/{id}/report',  [ReviewController::class, 'report'])->whereNumber('id');

}); 

