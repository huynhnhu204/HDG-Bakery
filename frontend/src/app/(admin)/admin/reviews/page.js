"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const KEY = "admin_token";

function getToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function normImg(src) {
  if (!src) return "/logo.png";
  if (typeof src !== "string") return "/logo.png";
  if (src.startsWith("http")) return src;
  if (src.startsWith("storage/")) return `${BASE}${API}/${src}`;
  if (src.startsWith("/")) return `${BASE}${API}${src}`;
  return "/logo.png";
}

export default function AdminReviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "");
  const [filterRating, setFilterRating] = useState(searchParams.get("rating") || "");
  const [filterProduct, setFilterProduct] = useState(searchParams.get("product_id") || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterStatus, filterRating, filterProduct]);

  async function loadReviews() {
    setLoading(true);
    try {
      const url = new URL(`${BASE}${API}/reviews`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("per_page", "20");
      if (filterStatus) url.searchParams.set("status", filterStatus);
      if (filterRating) url.searchParams.set("rating", filterRating);
      if (filterProduct) url.searchParams.set("product_id", filterProduct);

      const token = getToken();
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        cache: "no-store",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setReviews(data.data || []);
      setTotalPages(data.last_page || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Load reviews error:", err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleModerate(reviewId, action) {
    if (!confirm(`Bạn có chắc muốn ${action === "approve" ? "duyệt" : action === "hide" ? "ẩn" : action === "pin" ? "ghim" : "bỏ ghim"} đánh giá này?`)) {
      return;
    }

    setBusy(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE}${API}/reviews/${reviewId}/moderate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadReviews();
      alert("Thành công!");
    } catch (err) {
      alert("Có lỗi: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  const getStatusBadge = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      hidden: "bg-gray-100 text-gray-800",
    };
    const labels = {
      pending: "Chờ duyệt",
      approved: "Đã duyệt",
      hidden: "Đã ẩn",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || colors.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Quản lý đánh giá</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Trạng thái</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="hidden">Đã ẩn</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Số sao</label>
            <select
              value={filterRating}
              onChange={(e) => {
                setFilterRating(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Tất cả</option>
              <option value="5">5 sao</option>
              <option value="4">4 sao</option>
              <option value="3">3 sao</option>
              <option value="2">2 sao</option>
              <option value="1">1 sao</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Product ID</label>
            <input
              type="number"
              value={filterProduct}
              onChange={(e) => {
                setFilterProduct(e.target.value);
                setPage(1);
              }}
              placeholder="Lọc theo sản phẩm"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterStatus("");
                setFilterRating("");
                setFilterProduct("");
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Tổng số</div>
          <div className="text-2xl font-bold">{total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Chờ duyệt</div>
          <div className="text-2xl font-bold text-yellow-600">
            {reviews.filter((r) => r.status === "pending").length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Đã duyệt</div>
          <div className="text-2xl font-bold text-green-600">
            {reviews.filter((r) => r.status === "approved").length}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Không có đánh giá nào
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Sản phẩm</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Khách hàng</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Đánh giá</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nội dung</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reviews.map((review) => {
                  const images = Array.isArray(review.images) ? review.images : [];
                  return (
                    <tr key={review.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{review.id}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {review.product?.thumbnail && (
                            <Image
                              src={normImg(review.product.thumbnail)}
                              alt={review.product?.name || ""}
                              width={40}
                              height={40}
                              className="rounded"
                            />
                          )}
                          <div>
                            <div className="font-medium">{review.product?.name || `SP #${review.product_id}`}</div>
                            <div className="text-xs text-gray-500">ID: {review.product_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{review.nickname || "Khách hàng"}</div>
                        {review.is_verified && (
                          <span className="text-xs text-green-600">✓ Đã mua hàng</span>
                        )}
                        {review.pinned && (
                          <span className="text-xs text-amber-600 ml-2">📌 Ghim</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-amber-500">
                            {"⭐".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                          </span>
                          <span className="text-sm text-gray-600">({review.rating}/5)</span>
                        </div>
                        {review.title && (
                          <div className="text-xs text-gray-600 mt-1">{review.title}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs">
                        <div className="line-clamp-2">{review.content}</div>
                        {images.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">📷 {images.length} ảnh</div>
                        )}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(review.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/admin/reviews/${review.id}`)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Xem
                          </button>
                          {review.status !== "approved" && (
                            <button
                              onClick={() => handleModerate(review.id, "approve")}
                              disabled={busy}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                            >
                              Duyệt
                            </button>
                          )}
                          {review.status !== "hidden" && (
                            <button
                              onClick={() => handleModerate(review.id, "hide")}
                              disabled={busy}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                            >
                              Ẩn
                            </button>
                          )}
                          {!review.pinned ? (
                            <button
                              onClick={() => handleModerate(review.id, "pin")}
                              disabled={busy}
                              className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 disabled:opacity-50"
                            >
                              Ghim
                            </button>
                          ) : (
                            <button
                              onClick={() => handleModerate(review.id, "unpin")}
                              disabled={busy}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                            >
                              Bỏ ghim
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Hiển thị {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} / {total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1 || busy}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="text-sm">Trang {page}/{totalPages}</span>
                <button
                  disabled={page >= totalPages || busy}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}