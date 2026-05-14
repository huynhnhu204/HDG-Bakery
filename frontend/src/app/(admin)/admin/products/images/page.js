"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Upload, Image as ImageIcon, Trash2, Eye, EyeOff, Star, StarOff, GripVertical, Search, X, Check
} from "lucide-react";

/* ====== config ====== */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const KEY = "admin_token";

/* ====== helpers ====== */
const cx = (...xs) => xs.filter(Boolean).join(" ");

function normImg(raw) {
  if (!raw) return "/file.svg";
  if (raw.startsWith("http") || raw.startsWith("/")) return raw;
  const cleaned = raw.replace(/^\/+/, "");
  return `${BASE}${API}/storage/${cleaned.replace(/^storage\//, "")}`;
}

async function jfetch(url, { method = "GET", body, formData } = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem(KEY) : "";
  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (formData) {
    delete headers["Content-Type"];
  } else if (body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    cache: "no-store",
    body: formData ? formData : body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data ?? {};
}

/* ====== page ====== */
export default function ProductImagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadMode, setUploadMode] = useState("file"); // "file" | "url"
  const [urlInput, setUrlInput] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const fileInputRef = useRef(null);
  const urlInputRef = useRef(null);

  // Load products list
  async function loadProducts() {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams();
      params.set("per_page", "100");
      if (searchQuery) params.set("q", searchQuery);

      const data = await jfetch(`${BASE}${API}/products?${params.toString()}`);
      const list = Array.isArray(data?.data) ? data.data : [];
      setProducts(list);
    } catch (e) {
      setErrorMsg("Không tải được danh sách sản phẩm: " + e.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  // Load images for selected product
  async function loadImages(productId) {
    if (!productId) {
      setImages([]);
      return;
    }

    setBusy(true);
    try {
      const data = await jfetch(`${BASE}${API}/product-images?product_id=${productId}&admin=1&per_page=100`);
      const list = Array.isArray(data?.data) ? data.data : [];
      setImages(list);
    } catch (e) {
      setErrorMsg("Không tải được danh sách ảnh: " + e.message);
      setImages([]);
    } finally {
      setBusy(false);
    }
  }

  // Load product detail
  async function loadProductDetail(productId) {
    try {
      const data = await jfetch(`${BASE}${API}/products/${productId}`);
      setSelectedProduct(data);
      await loadImages(productId);
    } catch (e) {
      setErrorMsg("Không tải được thông tin sản phẩm: " + e.message);
      setSelectedProduct(null);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  // Handle product selection
  function handleSelectProduct(product) {
    setSelectedProduct(product);
    loadImages(product.id);
    setErrorMsg("");
  }

  // Upload files
  async function handleFileUpload(files) {
    if (!files || files.length === 0 || !selectedProduct) return;

    setBusy(true);
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("product_id", selectedProduct.id);
      Array.from(files).forEach((file) => {
        formData.append("image_files[]", file);
      });

      await jfetch(`${BASE}${API}/product-images`, {
        method: "POST",
        formData,
      });

      await loadImages(selectedProduct.id);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setErrorMsg("Lỗi upload ảnh: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // Add URLs
  async function handleAddUrls() {
    if (!urlInput.trim() || !selectedProduct) return;

    const urlList = urlInput
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s && s.startsWith("https://"));

    if (urlList.length === 0) {
      setErrorMsg("Vui lòng nhập URL hợp lệ (https://)");
      return;
    }

    setBusy(true);
    setErrorMsg("");
    try {
      await jfetch(`${BASE}${API}/product-images`, {
        method: "POST",
        body: {
          product_id: selectedProduct.id,
          image_urls: urlList,
        },
      });

      await loadImages(selectedProduct.id);
      setUrlInput("");
    } catch (e) {
      setErrorMsg("Lỗi thêm ảnh từ URL: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // Set primary
  async function handleSetPrimary(imageId) {
    if (!selectedProduct) return;
    setBusy(true);
    try {
      await jfetch(`${BASE}${API}/product-images/${imageId}/set-primary`, {
        method: "POST",
      });
      await loadImages(selectedProduct.id);
    } catch (e) {
      setErrorMsg("Lỗi đặt ảnh đại diện: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // Toggle status
  async function handleToggleStatus(imageId) {
    if (!selectedProduct) return;
    setBusy(true);
    try {
      await jfetch(`${BASE}${API}/product-images/${imageId}/toggle-status`, {
        method: "POST",
      });
      await loadImages(selectedProduct.id);
    } catch (e) {
      setErrorMsg("Lỗi cập nhật trạng thái: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // Delete
  async function handleDelete(imageId) {
    if (!confirm("Bạn có chắc muốn xóa ảnh này?")) return;
    if (!selectedProduct) return;

    setBusy(true);
    try {
      await jfetch(`${BASE}${API}/product-images/${imageId}`, {
        method: "DELETE",
      });
      await loadImages(selectedProduct.id);
    } catch (e) {
      setErrorMsg("Lỗi xóa ảnh: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // Drag & Drop sort
  function handleDragStart(index) {
    setDragIndex(index);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  async function handleDragEnd() {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex || !selectedProduct) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder locally
    const newImages = [...images];
    const [moved] = newImages.splice(dragIndex, 1);
    newImages.splice(dragOverIndex, 0, moved);
    setImages(newImages);

    // Update sort values
    const items = newImages.map((img, idx) => ({
      id: img.id,
      sort: idx,
    }));

    try {
      await jfetch(`${BASE}${API}/product-images/sort`, {
        method: "POST",
        body: { items },
      });
      await loadImages(selectedProduct.id);
    } catch (e) {
      setErrorMsg("Lỗi cập nhật thứ tự: " + e.message);
      await loadImages(selectedProduct.id); // Reload to revert
    }

    setDragIndex(null);
    setDragOverIndex(null);
  }

  // Search products
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý hình ảnh sản phẩm</h1>
          <p className="text-gray-600 mt-2">Chọn sản phẩm và quản lý gallery ảnh</p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {errorMsg}
            <button
              onClick={() => setErrorMsg("")}
              className="float-right text-red-700 hover:text-red-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Products list */}
          <div className="lg:col-span-1 bg-white rounded-lg border p-4 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Danh sách sản phẩm</h2>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm sản phẩm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
                />
              </div>

              {/* Products list */}
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="h-8 w-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
                  <div className="text-sm">Đang tải...</div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Không tìm thấy sản phẩm nào</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className={cx(
                        "w-full text-left p-3 rounded-lg border transition",
                        selectedProduct?.id === product.id
                          ? "bg-orange-50 border-orange-500 text-orange-900"
                          : "bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50/50"
                      )}
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-gray-500 mt-1">ID: {product.id}</div>
                      {product.category && (
                        <div className="text-xs text-gray-500">Danh mục: {product.category.name}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Gallery management */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedProduct ? (
              <div className="bg-white rounded-lg border p-12 text-center">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600">Vui lòng chọn một sản phẩm để quản lý ảnh</p>
              </div>
            ) : (
              <>
                {/* Selected product info */}
                <div className="bg-white rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{selectedProduct.name}</h2>
                      <p className="text-sm text-gray-500 mt-1">ID: {selectedProduct.id}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setImages([]);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Upload section */}
                <div className="bg-white rounded-lg border p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Thêm ảnh</h3>

                  {/* Tabs */}
                  <div className="flex gap-2 border-b">
                    <button
                      onClick={() => setUploadMode("file")}
                      className={cx(
                        "px-4 py-2 text-sm font-medium transition",
                        uploadMode === "file"
                          ? "text-orange-600 border-b-2 border-orange-600"
                          : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      <Upload className="w-4 h-4 inline mr-2" />
                      Upload file
                    </button>
                    <button
                      onClick={() => setUploadMode("url")}
                      className={cx(
                        "px-4 py-2 text-sm font-medium transition",
                        uploadMode === "url"
                          ? "text-orange-600 border-b-2 border-orange-600"
                          : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      <ImageIcon className="w-4 h-4 inline mr-2" />
                      Dán URL
                    </button>
                  </div>

                  {/* File upload */}
                  {uploadMode === "file" && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleFileUpload(e.target.files)}
                        className="hidden"
                        id="file-upload"
                        disabled={busy}
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload className="w-12 h-12 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Kéo thả ảnh vào đây hoặc click để chọn
                        </span>
                        <span className="text-xs text-gray-400">
                          Hỗ trợ: JPG, PNG, WebP (tối đa 10MB/ảnh)
                        </span>
                      </label>
                    </div>
                  )}

                  {/* URL input */}
                  {uploadMode === "url" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nhập URL ảnh (mỗi URL một dòng, chỉ nhận https://)
                        </label>
                        <textarea
                          ref={urlInputRef}
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
                          rows={4}
                          disabled={busy}
                        />
                      </div>
                      <button
                        onClick={handleAddUrls}
                        disabled={busy || !urlInput.trim()}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Thêm ảnh
                      </button>
                    </div>
                  )}
                </div>

                {/* Images grid */}
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Danh sách ảnh ({images.length})
                  </h3>

                  {busy && images.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <div className="h-8 w-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
                      <div className="text-sm">Đang tải...</div>
                    </div>
                  ) : images.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>Chưa có ảnh nào. Hãy thêm ảnh để bắt đầu.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {images.map((img, idx) => (
                        <div
                          key={img.id}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={cx(
                            "relative group border rounded-lg overflow-hidden transition",
                            img.is_primary ? "ring-2 ring-orange-500" : "",
                            dragIndex === idx ? "opacity-50" : "",
                            dragOverIndex === idx ? "border-orange-500" : ""
                          )}
                        >
                          {/* Image */}
                          <div className="aspect-square bg-gray-100 relative">
                            <img
                              src={normImg(img.image_url || img.image)}
                              alt={img.alt || ""}
                              className="w-full h-full object-cover"
                            />

                            {/* Drag handle */}
                            <div className="absolute top-2 left-2 bg-black/50 text-white p-1 rounded cursor-move">
                              <GripVertical className="w-4 h-4" />
                            </div>

                            {/* Primary badge */}
                            {img.is_primary && (
                              <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium">
                                Đại diện
                              </div>
                            )}

                            {/* Status badge */}
                            {img.status === 0 && (
                              <div className="absolute bottom-2 left-2 bg-gray-700 text-white px-2 py-1 rounded text-xs">
                                Đã ẩn
                              </div>
                            )}

                            {/* Actions overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSetPrimary(img.id)}
                                className={cx(
                                  "p-2 rounded text-white hover:bg-white/20 transition",
                                  img.is_primary ? "bg-orange-500" : "bg-gray-800"
                                )}
                                title={img.is_primary ? "Đã đặt làm đại diện" : "Đặt làm đại diện"}
                                disabled={busy}
                              >
                                {img.is_primary ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
                              </button>
                              <button
                                onClick={() => handleToggleStatus(img.id)}
                                className="p-2 rounded bg-gray-800 text-white hover:bg-white/20 transition"
                                title={img.status === 1 ? "Ẩn ảnh" : "Hiện ảnh"}
                                disabled={busy}
                              >
                                {img.status === 1 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                              <button
                                onClick={() => handleDelete(img.id)}
                                className="p-2 rounded bg-red-600 text-white hover:bg-red-700 transition"
                                title="Xóa ảnh"
                                disabled={busy}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>

                            {/* Sort number */}
                            <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                              #{img.sort}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="p-2 text-xs text-gray-600">
                            <div className="truncate">{img.title || img.alt || "Không có tiêu đề"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-medium mb-2">💡 Hướng dẫn:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Kéo thả ảnh để sắp xếp thứ tự hiển thị</li>
                    <li>Click vào biểu tượng ⭐ để đặt ảnh đại diện (mỗi sản phẩm chỉ có 1 ảnh đại diện)</li>
                    <li>Click vào biểu tượng 👁️ để ẩn/hiện ảnh (ảnh ẩn sẽ không hiển thị trên storefront)</li>
                    <li>Click vào biểu tượng 🗑️ để xóa ảnh (có thể khôi phục sau)</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}












