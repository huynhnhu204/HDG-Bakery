"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, Star, Percent } from "lucide-react";
import FavoriteButton from "./FavoriteButton";

const BASE_API = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "") + "/api/v1";

// Component hiển thị sản phẩm đơn
function ProductCard({ product }) {
  const discount = product.price_buy && product.price_sale 
    ? Math.round(100 - (product.price_sale / product.price_buy) * 100)
    : 0;
  
  // Ưu tiên slug, fallback về ID (đồng nhất với trang tất cả sản phẩm)
  const productHref = `/product/${product.slug || product.id}`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
      <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
        <Link href={productHref}>
          <img
            src={product.image_url || product.image || "/logo.png"}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = "/logo.png";
            }}
          />
        </Link>
        
        {/* Heart icon - Top Right */}
        <div className="absolute top-2 right-2 z-10">
          <FavoriteButton 
            productId={product.id} 
            className="bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:scale-110 transition-transform shadow-sm" 
          />
        </div>
        
        {/* Two action buttons - Bottom Center (always visible) */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          <Link
            href={productHref}
            className="bg-amber-700/90 backdrop-blur-sm text-white rounded-full p-2.5 hover:bg-amber-800/90 transition-all hover:scale-110 shadow-lg"
            aria-label="Thêm vào giỏ hàng"
            title="Thêm vào giỏ hàng"
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16l-2 12H6L4 4zm8 15a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </Link>
          <Link
            href={productHref}
            className="bg-amber-700/90 backdrop-blur-sm text-white rounded-full p-2.5 hover:bg-amber-800/90 transition-all hover:scale-110 shadow-lg"
            aria-label="Xem chi tiết"
            title="Xem chi tiết"
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </Link>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <Link href={productHref}>
          <h3 className="text-base font-bold text-gray-900 line-clamp-2 mb-2 hover:text-amber-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="mt-auto">
          {product.price_sale && product.price_sale < product.price_buy ? (
            <>
              <del className="text-sm text-gray-400 mr-2">
                {Number(product.price_buy).toLocaleString("vi-VN")}₫
              </del>
              <span className="text-lg font-bold text-amber-600">
                {Number(product.price_sale).toLocaleString("vi-VN")}₫
              </span>
            </>
          ) : (
            <span className="text-lg font-bold text-amber-600">
              {Number(product.price_buy || product.price || 0).toLocaleString("vi-VN")}₫
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Component section sản phẩm nổi bật
function FeaturedSection({ title, icon: Icon, products, loading, error }) {
  if (loading) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Icon className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Icon className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          </div>
          <p className="text-red-600">Lỗi tải dữ liệu: {error}</p>
        </div>
      </section>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Icon className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="text-center mt-8">
          <Link 
            href="/product" 
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Xem tất cả sản phẩm
          </Link>
        </div>
      </div>
    </section>
  );
}

// Component chính
export default function FeaturedProducts() {
  const [mostViewed, setMostViewed] = useState([]);
  const [bestSelling, setBestSelling] = useState([]);
  const [mostDiscounted, setMostDiscounted] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch sản phẩm được xem nhiều nhất (giả sử có field view_count)
        const viewedRes = await fetch(`${BASE_API}/products?sort=view_count_desc&per_page=6&status=1`);
        const viewedData = await viewedRes.json();
        setMostViewed(viewedData?.data || []);

        // Fetch sản phẩm bán chạy nhất (giả sử có field sales_count)
        const sellingRes = await fetch(`${BASE_API}/products?sort=sales_count_desc&per_page=6&status=1`);
        const sellingData = await sellingRes.json();
        setBestSelling(sellingData?.data || []);

        // Fetch sản phẩm giảm giá nhiều nhất
        const discountRes = await fetch(`${BASE_API}/products?sort=discount_desc&per_page=6&status=1&on_sale=1`);
        const discountData = await discountRes.json();
        setMostDiscounted(discountData?.data || []);

      } catch (err) {
        setError(err.message || "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-0">
      <FeaturedSection
        title="Được xem nhiều nhất"
        icon={TrendingUp}
        products={mostViewed}
        loading={loading}
        error={error}
      />
      
      <FeaturedSection
        title="Bán chạy nhất"
        icon={Star}
        products={bestSelling}
        loading={loading}
        error={error}
      />
      
      <FeaturedSection
        title="Đang giảm giá nhiều nhất"
        icon={Percent}
        products={mostDiscounted}
        loading={loading}
        error={error}
      />
    </div>
  );
}






