"use client";

import { useState, useRef } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

const SUGGESTED_TAGS = [
  "Không quá ngọt",
  "Kem béo",
  "Bánh mềm",
  "Thơm ngon",
  "Đẹp mắt",
  "Giá hợp lý",
  "Giao hàng nhanh",
];

export default function ReviewForm({ productId, productName, onSuccess, onClose }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else if (selectedTags.length < 10) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - images.length);
    const validFiles = files.filter((file) => {
      if (file.size > 2 * 1024 * 1024) {
        alert(`Ảnh ${file.name} quá lớn, vui lòng chọn ảnh dưới 2MB.`);
        return false;
      }
      return file.type.startsWith("image/");
    });

    const newImages = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages([...images, ...newImages]);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    images[index]?.preview && URL.revokeObjectURL(images[index].preview);
    setImages(newImages);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (rating === 0) {
      setError("Vui lòng chọn số sao đánh giá.");
      return;
    }

    if (content.trim().length < 20) {
      setError("Hãy chia sẻ thêm vài cảm nhận (tối thiểu 20 chữ).");
      return;
    }

    if (content.trim().length > 2000) {
      setError("Nội dung quá dài (tối đa 2000 ký tự).");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("product_id", productId);
      formData.append("rating", rating);
      formData.append("content", content.trim());
      if (title.trim()) formData.append("title", title.trim());
      if (nickname.trim()) formData.append("nickname", nickname.trim());
      
      // Gửi tags như array
      selectedTags.forEach((tag) => {
        formData.append("tags[]", tag);
      });

      images.forEach((img) => {
        formData.append("images[]", img.file);
      });

      const token = localStorage.getItem("token");
      const headers = {
        "Accept": "application/json", // Đảm bảo server trả về JSON
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      // Không set Content-Type cho FormData, browser sẽ tự động set với boundary

      const res = await fetch(`${API_BASE}/api/v1/reviews`, {
        method: "POST",
        headers,
        body: formData,
      });

      // Kiểm tra Content-Type trước khi parse JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Server response is not JSON:", text.substring(0, 500));
        throw new Error(`Server trả về lỗi (${res.status}). Vui lòng thử lại sau.`);
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Có lỗi xảy ra khi gửi đánh giá.");
      }

      // Cleanup preview URLs
      images.forEach((img) => URL.revokeObjectURL(img.preview));

      alert("Cảm ơn bạn! Đánh giá của bạn sẽ hiển thị sau khi được duyệt.");

      if (onSuccess) onSuccess(data.review);
      if (onClose) onClose();

      // Reset form
      setRating(0);
      setTitle("");
      setContent("");
      setNickname("");
      setSelectedTags([]);
      setImages([]);
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-amber-700">Viết đánh giá</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Info */}
          {productName && (
            <div className="p-3 bg-amber-50 rounded-lg">
              <span className="text-sm text-gray-600">Sản phẩm: </span>
              <span className="font-semibold">{productName}</span>
            </div>
          )}

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Đánh giá sao <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-3xl focus:outline-none transition-transform hover:scale-110"
                >
                  {star <= (hoverRating || rating) ? "⭐" : "☆"}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề (tùy chọn)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              placeholder="VD: Bánh rất ngon!"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="text-xs text-gray-500 mt-1">{title.length}/150</div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nội dung đánh giá <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              minLength={20}
              maxLength={2000}
              placeholder="Chia sẻ cảm nhận của bạn về sản phẩm này... (tối thiểu 20 chữ)"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              {content.length}/2000 ký tự (tối thiểu 20)
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (tùy chọn) - Chọn tối đa 10
            </label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    selectedTags.includes(tag)
                      ? "bg-amber-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hình ảnh (tối đa 5 ảnh, mỗi ảnh &lt; 2MB)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
            />
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 5}
                className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-amber-500 hover:text-amber-600 disabled:opacity-50"
              >
                + Thêm ảnh ({images.length}/5)
              </button>
              {images.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img.preview}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Biệt danh hiển thị (tùy chọn)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={80}
              placeholder="Tên hiển thị khi đánh giá (mặc định: Khách hàng)"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

