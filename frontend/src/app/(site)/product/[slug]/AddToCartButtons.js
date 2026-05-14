"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const CART_KEY = "cart";

/**
 * Component thêm sản phẩm vào giỏ hàng
 */
export default function AddToCartButtons({
  apiBase,
  productId,
  priceBuy,
  priceSale,
  productName,
  productThumb,
  availableQuantity = 0,
  isInStock = true,
  variant = null,
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const API_URL = apiBase || API_BASE;

  // Xác định giá bán
  const unitPrice = useMemo(() => {
    if (variant) {
      const sale = Number(variant.price_sale ?? 0);
      const base = Number(variant.price ?? 0);
      return sale > 0 && sale < base ? sale : base;
    }
    const sale = Number(priceSale ?? 0);
    const base = Number(priceBuy ?? 0);
    return sale > 0 && sale < base ? sale : base;
  }, [variant, priceBuy, priceSale]);

  // Kiểm tra hết hàng
  const soldOut = useMemo(() => {
    if (variant && typeof variant.stock === "number") {
      return variant.stock <= 0;
    }
    return !isInStock || availableQuantity <= 0;
  }, [variant, isInStock, availableQuantity]);

  // Giới hạn số lượng
  const maxQty = Math.min(99, availableQuantity > 0 ? availableQuantity : 99);

  // Hàm clamp số lượng
  const clampQty = (n) => {
    const num = Number(n || 1);
    if (num < 1) return 1;
    if (num > maxQty) return maxQty;
    return num;
  };

  // Đọc giỏ hàng từ localStorage
  const getLocalCart = () => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return { items: [] };
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.items) ? parsed : { items: [] };
    } catch {
      return { items: [] };
    }
  };

  // Lưu giỏ hàng vào localStorage
  const saveLocalCart = (cart) => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      window.dispatchEvent(new Event("cart-updated"));
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  };

  // Thêm vào giỏ hàng localStorage
  const addToLocalCart = (product) => {
    const cart = getLocalCart();
    const items = cart.items || [];
    const id = product.product_id;

    // Tìm sản phẩm đã có
    const existingIndex = items.findIndex(
      (item) => item.product_id === id
    );

    if (existingIndex >= 0) {
      // Cập nhật số lượng
      items[existingIndex].qty = clampQty(
        items[existingIndex].qty + product.qty
      );
    } else {
      // Thêm mới
      items.push({
        product_id: id,
        name: product.name,
        price: product.price,
        qty: clampQty(product.qty),
        image: product.image,
      });
    }

    cart.items = items;
    cart.updatedAt = Date.now();
    saveLocalCart(cart);
    return cart;
  };

  // Thêm vào giỏ hàng backend
  const addToBackendCart = async (product) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(product),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.warn("Backend cart sync failed:", error);
      throw error;
    }
  };

  // Handler thêm vào giỏ hàng
  const handleAddToCart = async (redirectToCart = false) => {
    if (soldOut) {
      alert("⚠️ Sản phẩm đang hết hàng. Vui lòng chọn sản phẩm khác!");
      return;
    }

    const quantity = clampQty(qty);
    if (quantity > availableQuantity && availableQuantity > 0) {
      alert(`⚠️ Chỉ còn ${availableQuantity} sản phẩm trong kho.`);
      setQty(Math.max(availableQuantity, 1));
      return;
    }

    setLoading(true);

    try {
      const product = {
        product_id: productId,
        name: productName || `Sản phẩm #${productId}`,
        price: unitPrice,
        qty: quantity,
        image: productThumb || null,
      };

      // Thêm vào localStorage trước
      addToLocalCart(product);

      // Thử sync với backend (không block)
      try {
        await addToBackendCart(product);
      } catch (backendError) {
        // Backend thất bại không ảnh hưởng, đã có localStorage
        console.warn("Backend sync failed, using localStorage only");
      }

      if (redirectToCart) {
        router.push("/cart");
      } else {
        alert("✅ Đã thêm sản phẩm vào giỏ hàng!");
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
      alert("❌ Lỗi: Không thể thêm vào giỏ hàng. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {soldOut && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ⚠️ Sản phẩm hiện đã hết hàng. Vui lòng chọn sản phẩm khác hoặc quay lại sau.
        </div>
      )}

      {/* Chọn số lượng */}
      <div className="flex items-stretch gap-3">
        <div
          className={`flex items-center border rounded-lg overflow-hidden ${
            soldOut ? "opacity-60" : ""
          }`}
        >
          <button
            type="button"
            onClick={() => setQty((v) => clampQty(v - 1))}
            className="px-3 py-3 text-lg hover:bg-gray-50 disabled:opacity-50"
            disabled={soldOut || loading || qty <= 1}
          >
            −
          </button>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(clampQty(e.target.value))}
            className="w-14 text-center outline-none py-3 border-x"
            min="1"
            max={maxQty}
            disabled={soldOut || loading}
          />
          <button
            type="button"
            onClick={() => setQty((v) => clampQty(v + 1))}
            className="px-3 py-3 text-lg hover:bg-gray-50 disabled:opacity-50"
            disabled={soldOut || loading || qty >= maxQty}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleAddToCart(false)}
          disabled={soldOut || loading}
          className={`px-6 py-3 rounded-lg font-semibold transition flex-1 ${
            soldOut
              ? "border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-amber-600 hover:bg-amber-700 text-white shadow-md disabled:opacity-60"
          }`}
        >
          {soldOut ? "Hết hàng" : loading ? "Đang thêm..." : "🛒 Thêm vào giỏ"}
        </button>

        <button
          type="button"
          onClick={() => handleAddToCart(true)}
          disabled={soldOut || loading}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            soldOut
              ? "border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
              : "border border-amber-600 text-amber-700 hover:bg-amber-50 disabled:opacity-60"
          }`}
        >
          {soldOut ? "Không khả dụng" : loading ? "Đang xử lý..." : "⚡ Mua ngay"}
        </button>
      </div>

      {/* Thông báo số lượng còn lại */}
      {!soldOut && availableQuantity > 0 && availableQuantity <= 5 && (
        <p className="text-sm text-amber-700 font-medium">
          ⚠️ Chỉ còn {availableQuantity} sản phẩm trong kho
        </p>
      )}
    </div>
  );
}
