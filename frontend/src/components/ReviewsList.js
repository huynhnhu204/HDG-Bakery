"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

function normImg(src) {
  if (!src) return "/logo.png";
  if (typeof src !== "string") return "/logo.png";
  if (src.startsWith("http")) return src;
  if (src.startsWith("storage/")) return `${API_BASE}/api/v1/${src}`;
  if (src.startsWith("/")) return `${API_BASE}/api/v1${src}`;
  return "/logo.png";
}

export default function ReviewsList({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterStars, setFilterStars] = useState(null);
  const [sort, setSort] = useState("new"); // new|helpful|photos

  useEffect(() => {
    let aborted = false;
    
    async function loadReviews() {
      setLoading(true);
      try {
        const url = new URL(`${API_BASE}/api/v1/products/${productId}/reviews`);
        url.searchParams.set("page", String(page));
        url.searchParams.set("per_page", "10");
        if (filterStars) url.searchParams.set("stars", String(filterStars));
        if (sort) url.searchParams.set("sort", sort);

        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        
        if (!aborted) {
          // Laravel paginator trả về items là paginator object
          const paginator = data.items || {};
          setReviews(paginator.data || []);
          setTotalPages(paginator.last_page || 1);
          setTotal(paginator.total || 0);
        }
      } catch (err) {
        console.error("Load reviews error:", err);
        if (!aborted) {
          setReviews([]);
          setTotalPages(1);
          setTotal(0);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    loadReviews();
    return () => { aborted = true; };
  }, [productId, page, filterStars, sort]);

  const handleHelpful = async (reviewId) => {
    try {
      await fetch(`${API_BASE}/api/v1/reviews/${reviewId}/helpful`, {
        method: "POST",
      });
      // Reload để cập nhật helpful_count
      const url = new URL(`${API_BASE}/api/v1/products/${productId}/reviews`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("per_page", "10");
      if (filterStars) url.searchParams.set("stars", String(filterStars));
      if (sort) url.searchParams.set("sort", sort);
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      const paginator = data.items || {};
      setReviews(paginator.data || []);
    } catch (err) {
      console.error("Helpful error:", err);
    }
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="mt-8 text-center py-8 text-gray-500">
        Đang tải đánh giá...
      </div>
    );
  }

  if (!loading && reviews.length === 0) {
    return (
      <div className="mt-8 text-center py-8 text-gray-500">
        <p>Chưa có đánh giá nào cho sản phẩm này.</p>
        <p className="text-sm mt-2">Hãy là người đầu tiên đánh giá sản phẩm này!</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b">
        {/* Filter by stars */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Lọc theo sao:</span>
          <div className="flex gap-1">
            {[null, 5, 4, 3, 2, 1].map((star) => (
              <button
                key={star || "all"}
                onClick={() => {
                  setFilterStars(star);
                  setPage(1);
                }}
                className={`px-3 py-1 text-sm rounded ${
                  filterStars === star
                    ? "bg-amber-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {star ? `${star}★` : "Tất cả"}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-600">Sắp xếp:</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="new">Mới nhất</option>
            <option value="helpful">Hữu ích nhất</option>
            <option value="photos">Có ảnh</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((review) => {
          const images = Array.isArray(review.images) ? review.images : [];
          const tags = Array.isArray(review.tags) ? review.tags : [];

          return (
            <div key={review.id} className="border-b pb-6 last:border-0">
              {/* Header: Avatar, Name, Rating, Date */}
              <div className="flex items-start gap-3 mb-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  <Image
                    src="/logo.png"
                    alt={review.nickname || "Khách hàng"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-900">
                      {review.nickname || "Khách hàng"}
                    </h4>
                    {review.is_verified && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                        ✓ Đã mua hàng
                      </span>
                    )}
                    {review.pinned && (
                      <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                        📌 Đánh giá nổi bật
                      </span>
                    )}
                  </div>
                  
                  {/* Rating Stars */}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          xmlns="http://www.w3.org/2000/svg"
                          fill={i < review.rating ? "currentColor" : "none"}
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
                    <span className="text-xs text-gray-500">
                      {new Date(review.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Title */}
              {review.title && (
                <h5 className="font-semibold text-gray-900 mb-2">{review.title}</h5>
              )}

              {/* Content */}
              <p className="text-gray-700 mb-3 whitespace-pre-wrap">{review.content}</p>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Images */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded overflow-hidden border cursor-pointer hover:opacity-80 transition"
                      onClick={() => window.open(normImg(img), "_blank")}
                    >
                      <Image
                        src={normImg(img)}
                        alt={`Review image ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Reply from admin */}
              {review.reply_content && (
                <div className="mt-3 p-3 bg-amber-50 border-l-4 border-amber-600 rounded-r">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-amber-700">Phản hồi từ cửa hàng</span>
                    {review.reply_created_at && (
                      <span className="text-xs text-gray-500">
                        {new Date(review.reply_created_at).toLocaleDateString("vi-VN")}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm">{review.reply_content}</p>
                </div>
              )}

              {/* Helpful Button */}
              <div className="mt-3 flex items-center gap-4">
                <button
                  onClick={() => handleHelpful(review.id)}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-amber-600 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0117.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-11V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 1.292L6.5 9.5m7-11v1.905a2.5 2.5 0 002.5 2.5h.095m-3.095 1.795v1.905a2.5 2.5 0 002.5 2.5h.095"
                    />
                  </svg>
                  Hữu ích ({review.helpful_count || 0})
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Trước
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  disabled={loading}
                  className={`px-3 py-2 text-sm rounded ${
                    page === pageNum
                      ? "bg-amber-600 text-white"
                      : "border hover:bg-gray-50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau →
          </button>

          <span className="text-sm text-gray-600 ml-4">
            Trang {page} / {totalPages} ({total} đánh giá)
          </span>
        </div>
      )}
    </div>
  );
}
