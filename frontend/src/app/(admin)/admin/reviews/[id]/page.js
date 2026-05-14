"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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

export default function ReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reviewId = params.id;

  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  useEffect(() => {
    loadReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  async function loadReview() {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE}${API}/reviews?page=1&per_page=100`, {
        headers: {
          Accept: "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        cache: "no-store",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      // Find the review by ID
      const found = data.data?.find((r) => r.id === Number(reviewId));
      if (found) {
        setReview(found);
        setReplyContent(found.reply_content || "");
      }
    } catch (err) {
      console.error("Load review error:", err);
      alert("Không tải được đánh giá");
    } finally {
      setLoading(false);
    }
  }

  async function handleModerate(action) {
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
      await loadReview();
      alert("Thành công!");
    } catch (err) {
      alert("Có lỗi: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReply() {
    if (!replyContent.trim() || replyContent.trim().length < 5) {
      alert("Nội dung trả lời tối thiểu 5 ký tự");
      return;
    }

    setBusy(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE}${API}/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ content: replyContent.trim() }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadReview();
      alert("Đã gửi trả lời!");
    } catch (err) {
      alert("Có lỗi: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Đang tải...</div>;
  }

  if (!review) {
    return (
      <div className="p-6 text-center text-gray-500">
        Không tìm thấy đánh giá
      </div>
    );
  }

  const images = Array.isArray(review.images) ? review.images : [];
  const tags = Array.isArray(review.tags) ? review.tags : [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Chi tiết đánh giá #{review.id}</h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          ← Quay lại
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Review Content */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">Nội dung đánh giá</h2>

          {/* Header */}
          <div className="flex items-start gap-4 mb-4 pb-4 border-b">
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              <Image src="/logo.png" alt="Avatar" fill className="object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="font-semibold text-lg">{review.nickname || "Khách hàng"}</h3>
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

              {/* Rating */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl text-amber-500">
                  {"⭐".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                </span>
                <span className="text-gray-600">({review.rating}/5)</span>
              </div>

              <div className="text-sm text-gray-500">
                {new Date(review.created_at).toLocaleString("vi-VN")}
              </div>
            </div>
          </div>

          {/* Title */}
          {review.title && (
            <h4 className="text-lg font-semibold mb-3">{review.title}</h4>
          )}

          {/* Content */}
          <p className="text-gray-700 whitespace-pre-wrap mb-4">{review.content}</p>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-medium mb-2">Hình ảnh ({images.length})</h5>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, idx) => (
                  <a
                    key={idx}
                    href={normImg(img)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative w-full h-32 rounded overflow-hidden border hover:opacity-80"
                  >
                    <Image src={normImg(img)} alt={`Review image ${idx + 1}`} fill className="object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-600">Trạng thái:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                review.status === "approved" ? "bg-green-100 text-green-800" :
                review.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                "bg-gray-100 text-gray-800"
              }`}>
                {review.status === "approved" ? "Đã duyệt" :
                 review.status === "pending" ? "Chờ duyệt" : "Đã ẩn"}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Hữu ích: {review.helpful_count || 0} | Báo cáo: {review.report_count || 0}
            </div>
          </div>
        </div>

        {/* Right: Actions & Reply */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">Thao tác</h2>
            <div className="space-y-2">
              {review.status !== "approved" && (
                <button
                  onClick={() => handleModerate("approve")}
                  disabled={busy}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  ✓ Duyệt đánh giá
                </button>
              )}
              {review.status !== "hidden" && (
                <button
                  onClick={() => handleModerate("hide")}
                  disabled={busy}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  Ẩn đánh giá
                </button>
              )}
              {!review.pinned ? (
                <button
                  onClick={() => handleModerate("pin")}
                  disabled={busy}
                  className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  📌 Ghim đánh giá
                </button>
              ) : (
                <button
                  onClick={() => handleModerate("unpin")}
                  disabled={busy}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Bỏ ghim
                </button>
              )}
            </div>
          </div>

          {/* Reply */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">Trả lời khách hàng</h2>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={6}
              placeholder="Cảm ơn bạn đã ghé tiệm! Tiệm sẽ điều chỉnh..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3"
            />
            <div className="text-xs text-gray-500 mb-3">
              {replyContent.length}/1000 ký tự (tối thiểu 5)
            </div>
            <button
              onClick={handleReply}
              disabled={busy || replyContent.trim().length < 5}
              className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              Gửi trả lời
            </button>

            {/* Existing reply */}
            {review.reply_content && (
              <div className="mt-4 p-3 bg-amber-50 border-l-4 border-amber-600 rounded-r">
                <div className="text-sm font-medium text-amber-700 mb-1">
                  Phản hồi hiện tại:
                </div>
                <p className="text-gray-700 text-sm">{review.reply_content}</p>
                {review.reply_created_at && (
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(review.reply_created_at).toLocaleString("vi-VN")}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product Info */}
          {review.product && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">Sản phẩm</h2>
              <div className="flex items-center gap-3">
                {review.product.thumbnail && (
                  <Image
                    src={normImg(review.product.thumbnail)}
                    alt={review.product.name}
                    width={60}
                    height={60}
                    className="rounded"
                  />
                )}
                <div>
                  <div className="font-medium">{review.product.name}</div>
                  <div className="text-sm text-gray-500">ID: {review.product_id}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

