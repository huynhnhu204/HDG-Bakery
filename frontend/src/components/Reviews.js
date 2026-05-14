"use client";

import { useEffect, useState, useMemo, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pin } from "lucide-react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

function normImg(src) {
  if (!src) return "/logo.png";
  if (typeof src !== "string") return "/logo.png";
  if (src.startsWith("http")) return src;
  if (src.startsWith("storage/")) return `${API_BASE}/api/v1/${src}`;
  if (src.startsWith("/")) return `${API_BASE}/api/v1${src}`;
  return "/logo.png";
}

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    
    async function loadFeaturedReviews() {
      try {
        const url = new URL(`${API_BASE}/api/v1/reviews/featured`);
        url.searchParams.set("limit", "6");
        
        // Simple cache for client-side requests
        const cacheKey = url.toString();
        const cached = sessionStorage.getItem(`review_cache_${cacheKey}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 120000) { // 2 minutes
              if (!aborted) {
                setReviews(parsed.data || []);
                setLoading(false);
              }
              return;
            }
          } catch {}
        }

        const res = await fetch(url);
        const data = await res.json();
        const reviewsData = data.data || [];
        
        // Cache the result
        try {
          sessionStorage.setItem(`review_cache_${cacheKey}`, JSON.stringify({
            data: reviewsData,
            timestamp: Date.now()
          }));
        } catch {}
        
        if (!aborted) {
          setReviews(reviewsData);
        }
      } catch (err) {
        console.error("Load featured reviews error:", err);
        if (!aborted) {
          setReviews([]);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    loadFeaturedReviews();
    return () => { aborted = true; };
  }, []);

  if (loading) {
    return (
      <section className="bg-[#faf7f2] p-6 rounded-lg shadow-md mb-10">
        <h2 className="text-xl md:text-2xl text-orange-600 font-bold mb-6">
          Khách hàng nói gì
        </h2>
        <div className="text-center py-8 text-gray-500">Đang tải đánh giá...</div>
      </section>
    );
  }

  if (reviews.length === 0) {
    return null; // Không hiển thị nếu không có review
  }

  return (
    <section className="bg-[#faf7f2] p-6 rounded-lg shadow-md mb-10">
      <h2 className="text-xl md:text-2xl text-orange-600 font-bold mb-6">
        Khách hàng nói gì
      </h2>

      <div className="grid md:grid-cols-3 gap-6">
        {reviews.map((r) => {
          const productName = r.product?.name || "Sản phẩm";
          const productSlug = r.product?.slug || r.product?.id;
          const productUrl = productSlug ? `/product/${productSlug}` : "#";

          return (
            <ReviewCard
              key={r.id}
              review={r}
              productName={productName}
              productUrl={productUrl}
              productSlug={productSlug}
            />
          );
        })}
      </div>
    </section>
  );
}

const ReviewCard = memo(({ review: r, productName, productUrl, productSlug }) => {
  return (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-gray-50">
      {/* Avatar + Tên */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          <Image
            src="/logo.png"
            alt={r.nickname || "Khách hàng"}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 truncate">
            {r.nickname || "Khách hàng"}
          </h3>
          {r.is_verified && (
            <span className="text-xs text-green-600">✓ Đã mua hàng</span>
          )}
        </div>
      </div>

      {/* Sản phẩm (nếu có) */}
      {productSlug && (
        <Link
          href={productUrl}
          className="text-xs text-amber-600 hover:text-amber-700 mb-2 inline-block hover:underline"
        >
          {productName}
        </Link>
      )}

      {/* Nội dung */}
      <p className="text-gray-600 text-sm mb-3 line-clamp-3">
        "{r.content}"
      </p>

      {/* Rating */}
      <div className="flex items-center justify-between">
        <div className="flex text-amber-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg
              key={i}
              xmlns="http://www.w3.org/2000/svg"
              fill={i < r.rating ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.004 6.174a1 1 0 00.95.69h6.503c.969 0 1.371 1.24.588 1.81l-5.26 3.822a1 1 0 00-.364 1.118l2.004 6.174c.3.921-.755 1.688-1.54 1.118l-5.26-3.822a1 1 0 00-1.175 0l-5.26 3.822c-.785.57-1.84-.197-1.54-1.118l2.004-6.174a1 1 0 00-.364-1.118L2.004 11.6c-.783-.57-.38-1.81.588-1.81h6.503a1 1 0 00.95-.69l2.004-6.174z"
              />
            </svg>
          ))}
        </div>
        {r.pinned && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
            <Pin size={12} aria-hidden="true" />
            Nổi bật
          </span>
        )}
      </div>
    </div>
  );
});
