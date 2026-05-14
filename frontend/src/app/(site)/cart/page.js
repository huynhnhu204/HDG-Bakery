"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const CART_KEY = "cart";
const TOKEN_KEY = "auth_token";

// Utils
const formatVND = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";
const clampQty = (q) => {
  const n = Number(q || 0);
  return n < 1 ? 1 : n > 99 ? 99 : n;
};

// Normalize image URL
const normalizeImage = (src) => {
  if (!src) return "/logo.png";
  if (typeof src !== "string") return "/logo.png";
  const raw = src.trim();
  if (!raw) return "/logo.png";
  if (raw.startsWith("http")) return raw;
  const cleaned = raw.replace(/^\/+/, "");
  return `${API_BASE}/api/v1/storage/${cleaned.replace(/^storage\//, "")}`;
};

// LocalStorage helpers
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

const saveLocalCart = (cart) => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
  } catch (error) {
    console.error("Failed to save cart:", error);
  }
};

// API helpers
const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
};

// Normalize cart items
const normalizeCartItems = (data) => {
  const items = Array.isArray(data) ? data : data?.items || [];
  return items.map((item) => ({
    id: item.product_id || item.id,
    product_id: item.product_id || item.id,
    name: item.name || "Sản phẩm",
    price: Number(item.price || 0),
    qty: Number(item.qty || item.quantity || 1),
    img: normalizeImage(item.image || item.thumb || item.img),
  }));
};

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [showCouponSuggestions, setShowCouponSuggestions] = useState(false);
  const couponCodeRef = useRef(null); // Để track coupon code hiện tại

  // Load giỏ hàng
  const loadCart = async () => {
    setLoading(true);
    try {
      // Ưu tiên localStorage
      const localCart = getLocalCart();
      if (localCart.items && localCart.items.length > 0) {
        setItems(normalizeCartItems(localCart));
      }

      // Thử sync với backend
      try {
        const backendCart = await apiRequest(`${API_BASE}/api/v1/cart`);
        const backendItems = normalizeCartItems(backendCart);

        if (backendItems.length > 0) {
          // Backend có dữ liệu, dùng backend
          setItems(backendItems);
          saveLocalCart({ items: backendCart.items || [], updatedAt: Date.now() });
        } else if (localCart.items && localCart.items.length > 0) {
          // Backend trống nhưng localStorage có, giữ localStorage
          setItems(normalizeCartItems(localCart));
        }
      } catch (backendError) {
        // Backend thất bại, dùng localStorage
        if (localCart.items && localCart.items.length > 0) {
          setItems(normalizeCartItems(localCart));
        }
      }
    } catch (error) {
      console.error("Load cart failed:", error);
      const localCart = getLocalCart();
      setItems(normalizeCartItems(localCart));
    } finally {
      setLoading(false);
    }
  };

  // Lắng nghe event cart-updated
  useEffect(() => {
    loadCart();

    const handleCartUpdated = () => {
      loadCart();
    };

    window.addEventListener("cart-updated", handleCartUpdated);

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdated);
    };
  }, []);

  // Load applied coupon from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("applied_coupon");
      if (saved) {
        const coupon = JSON.parse(saved);
        setAppliedCoupon(coupon);
        setCouponCode(coupon.code || "");
        couponCodeRef.current = coupon.code || null;
      }
    } catch (error) {
      console.error("Failed to load coupon:", error);
    }
  }, []);

  // Tính toán subtotal (phải định nghĩa trước khi dùng trong useEffect)
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items]
  );

  // Load available coupons từ API
  useEffect(() => {
    const loadAvailableCoupons = async () => {
      if (items.length === 0) {
        setAvailableCoupons([]);
        return;
      }

      setLoadingCoupons(true);
      try {
        const response = await apiRequest(`${API_BASE}/api/v1/coupons/public`);
        const coupons = Array.isArray(response.data) ? response.data : [];
        
        // Tính subtotal hiện tại để filter
        const currentSubtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
        
        // Lọc các coupon có thể áp dụng (kiểm tra min_order_amount)
        const applicableCoupons = coupons.filter((coupon) => {
          if (coupon.min_order_amount && currentSubtotal < coupon.min_order_amount) {
            return false;
          }
          return true;
        });

        setAvailableCoupons(applicableCoupons);
      } catch (error) {
        console.error("Failed to load available coupons:", error);
        setAvailableCoupons([]);
      } finally {
        setLoadingCoupons(false);
      }
    };

    loadAvailableCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, subtotal]);

  // Validate lại coupon đã áp dụng
  const validateAppliedCoupon = async (code) => {
    if (!code || items.length === 0) return;

    try {
      const token = localStorage.getItem(TOKEN_KEY);
      let userId = null;
      let email = null;
      let phone = null;

      if (token) {
        try {
          const userResponse = await fetch(`${API_BASE}/api/v1/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            userId = userData.id || null;
            email = userData.email || null;
            phone = userData.phone || null;
          }
        } catch (error) {
          // Ignore
        }
      }

      // Tính subtotal hiện tại
      const currentSubtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

      const response = await apiRequest(`${API_BASE}/api/v1/coupons/validate`, {
        method: "POST",
        body: JSON.stringify({
          code: code,
          subtotal: currentSubtotal,
          cart_items: items.map((item) => ({
            product_id: item.product_id,
            qty: item.qty,
            price: item.price,
          })),
          user_id: userId,
          email: email,
          phone: phone,
        }),
      });

      if (response.valid && response.coupon) {
        // Cập nhật discount amount mới (chỉ cập nhật, không thay đổi code)
        setAppliedCoupon((prev) => {
          const updated = {
            ...response.coupon,
            code: code,
          };
          localStorage.setItem("applied_coupon", JSON.stringify(updated));
          return updated;
        });
      } else {
        // Coupon không còn hợp lệ, xóa
        setAppliedCoupon(null);
        setCouponCode("");
        setCouponMessage(response.message || "Mã giảm giá không còn hợp lệ");
        couponCodeRef.current = null;
        localStorage.removeItem("applied_coupon");
      }
    } catch (error) {
      console.error("Failed to validate coupon:", error);
      // Không xóa coupon nếu lỗi network, chỉ log
    }
  };

  // Validate lại coupon khi subtotal thay đổi (chỉ khi đã có coupon)
  useEffect(() => {
    if (!couponCodeRef.current || items.length === 0) return;

    const timer = setTimeout(() => {
      validateAppliedCoupon(couponCodeRef.current);
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, items.length]);
  
  // Tính phí vận chuyển (miễn phí nếu có free_ship coupon)
  const shipping = useMemo(() => {
    if (appliedCoupon?.free_ship) return 0;
    return subtotal >= 500000 ? 0 : 30000;
  }, [subtotal, appliedCoupon]);
  
  // Tính giảm giá
  const discount = useMemo(() => {
    if (!appliedCoupon) return 0;
    return Number(appliedCoupon.discount_amount || 0);
  }, [appliedCoupon]);
  
  // Tổng tiền
  const total = Math.max(0, subtotal - discount + shipping);

  // Kiểm tra auth
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return false;
      const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Chuyển đến checkout
  const goCheckout = async () => {
    setBusy(true);
    try {
      const isAuthenticated = await checkAuth();
      if (isAuthenticated) {
        router.push("/checkout");
      } else {
        router.push("/login?next=/checkout");
      }
    } finally {
      setBusy(false);
    }
  };

  // Tăng số lượng
  const increaseQty = async (productId) => {
    const item = items.find((it) => it.product_id === productId);
    if (!item) return;

    const newQty = clampQty(item.qty + 1);
    const updatedItems = items.map((it) =>
      it.product_id === productId ? { ...it, qty: newQty } : it
    );
    setItems(updatedItems);

    // Cập nhật localStorage
    const cart = getLocalCart();
    const itemIndex = cart.items.findIndex(
      (it) => it.product_id === productId
    );
    if (itemIndex >= 0) {
      cart.items[itemIndex].qty = newQty;
      saveLocalCart(cart);
    }

    // Sync với backend
    try {
      await apiRequest(`${API_BASE}/api/v1/cart/update`, {
        method: "PUT",
        body: JSON.stringify({ product_id: productId, qty: newQty }),
      });
    } catch (error) {
      console.warn("Backend update failed:", error);
    }
  };

  // Giảm số lượng
  const decreaseQty = async (productId) => {
    const item = items.find((it) => it.product_id === productId);
    if (!item) return;

    const newQty = clampQty(item.qty - 1);
    if (newQty < 1) return;

    const updatedItems = items.map((it) =>
      it.product_id === productId ? { ...it, qty: newQty } : it
    );
    setItems(updatedItems);

    // Cập nhật localStorage
    const cart = getLocalCart();
    const itemIndex = cart.items.findIndex(
      (it) => it.product_id === productId
    );
    if (itemIndex >= 0) {
      cart.items[itemIndex].qty = newQty;
      saveLocalCart(cart);
    }

    // Sync với backend
    try {
      await apiRequest(`${API_BASE}/api/v1/cart/update`, {
        method: "PUT",
        body: JSON.stringify({ product_id: productId, qty: newQty }),
      });
    } catch (error) {
      console.warn("Backend update failed:", error);
    }
  };

  // Xóa sản phẩm
  const removeItem = async (productId) => {
    const updatedItems = items.filter((it) => it.product_id !== productId);
    setItems(updatedItems);

    // Cập nhật localStorage
    const cart = getLocalCart();
    cart.items = cart.items.filter((it) => it.product_id !== productId);
    saveLocalCart(cart);

    // Sync với backend
    try {
      await apiRequest(`${API_BASE}/api/v1/cart/items/${productId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.warn("Backend remove failed:", error);
    }
  };

  // Xóa toàn bộ
  const clearCart = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?")) {
      return;
    }

    setItems([]);
    saveLocalCart({ items: [] });
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponMessage("");
    couponCodeRef.current = null;
    localStorage.removeItem("applied_coupon");

    // Sync với backend
    try {
      await apiRequest(`${API_BASE}/api/v1/cart/clear`, {
        method: "POST",
      });
    } catch (error) {
      console.warn("Backend clear failed:", error);
    }
  };

  // Áp dụng mã giảm giá
  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponMessage("Vui lòng nhập mã giảm giá");
      return;
    }

    if (items.length === 0) {
      setCouponMessage("Giỏ hàng trống, không thể áp dụng mã giảm giá");
      return;
    }

    setCouponLoading(true);
    setCouponMessage("");

    try {
      // Lấy thông tin user nếu có
      const token = localStorage.getItem(TOKEN_KEY);
      let userId = null;
      let email = null;
      let phone = null;

      if (token) {
        try {
          const userResponse = await fetch(`${API_BASE}/api/v1/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            userId = userData.id || null;
            email = userData.email || null;
            phone = userData.phone || null;
          }
        } catch (error) {
          // Ignore error, continue without user info
        }
      }

      // Validate coupon
      const response = await apiRequest(`${API_BASE}/api/v1/coupons/validate`, {
        method: "POST",
        body: JSON.stringify({
          code: code,
          subtotal: subtotal,
          cart_items: items.map((item) => ({
            product_id: item.product_id,
            qty: item.qty,
            price: item.price,
          })),
          user_id: userId,
          email: email,
          phone: phone,
        }),
      });

      if (response.valid && response.coupon) {
        setAppliedCoupon(response.coupon);
        setCouponMessage(response.coupon.message || "Áp dụng mã thành công!");
        couponCodeRef.current = response.coupon.code;
        // Lưu vào localStorage
        localStorage.setItem("applied_coupon", JSON.stringify(response.coupon));
      } else {
        setAppliedCoupon(null);
        setCouponMessage(response.message || "Mã giảm giá không hợp lệ");
        couponCodeRef.current = null;
        localStorage.removeItem("applied_coupon");
      }
    } catch (error) {
      console.error("Failed to apply coupon:", error);
      setAppliedCoupon(null);
      setCouponMessage("Lỗi khi áp dụng mã giảm giá. Vui lòng thử lại!");
      localStorage.removeItem("applied_coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  // Xóa mã giảm giá
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponMessage("");
    couponCodeRef.current = null;
    localStorage.removeItem("applied_coupon");
  };

  // Áp dụng coupon từ danh sách gợi ý
  const applySuggestedCoupon = async (coupon) => {
    setCouponCode(coupon.code);
    setCouponLoading(true);
    setCouponMessage("");

    try {
      const token = localStorage.getItem(TOKEN_KEY);
      let userId = null;
      let email = null;
      let phone = null;

      if (token) {
        try {
          const userResponse = await fetch(`${API_BASE}/api/v1/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            userId = userData.id || null;
            email = userData.email || null;
            phone = userData.phone || null;
          }
        } catch (error) {
          // Ignore
        }
      }

      const response = await apiRequest(`${API_BASE}/api/v1/coupons/validate`, {
        method: "POST",
        body: JSON.stringify({
          code: coupon.code,
          subtotal: subtotal,
          cart_items: items.map((item) => ({
            product_id: item.product_id,
            qty: item.qty,
            price: item.price,
          })),
          user_id: userId,
          email: email,
          phone: phone,
        }),
      });

      if (response.valid && response.coupon) {
        setAppliedCoupon(response.coupon);
        setCouponMessage(response.coupon.message || "Áp dụng mã thành công!");
        couponCodeRef.current = response.coupon.code;
        localStorage.setItem("applied_coupon", JSON.stringify(response.coupon));
        setShowCouponSuggestions(false);
      } else {
        setAppliedCoupon(null);
        setCouponMessage(response.message || "Mã giảm giá không hợp lệ");
        couponCodeRef.current = null;
        localStorage.removeItem("applied_coupon");
      }
    } catch (error) {
      console.error("Failed to apply suggested coupon:", error);
      setAppliedCoupon(null);
      setCouponMessage("Lỗi khi áp dụng mã giảm giá. Vui lòng thử lại!");
      localStorage.removeItem("applied_coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  // Format mô tả giảm giá
  const getCouponDescription = (coupon) => {
    if (coupon.discount_type === "free_ship") {
      return "Miễn phí vận chuyển";
    } else if (coupon.discount_type === "percent") {
      const maxDiscount = coupon.max_discount 
        ? ` (tối đa ${formatVND(coupon.max_discount)})` 
        : "";
      return `Giảm ${coupon.discount_value}%${maxDiscount}`;
    } else if (coupon.discount_type === "fixed") {
      return `Giảm ${formatVND(coupon.discount_value)}`;
    }
    return coupon.description || "Giảm giá đặc biệt";
  };

  // Loading state
  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-2xl font-extrabold text-orange-600">
          Giỏ hàng
        </h1>
        <p className="text-gray-600">Đang tải…</p>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-2xl font-extrabold text-orange-600">
          Giỏ hàng
        </h1>
        <p className="text-gray-600">Chưa có sản phẩm nào trong giỏ hàng</p>
        <Link
          href="/product"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white hover:bg-orange-700"
        >
          Bắt đầu mua sắm
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M10 17l5-5-5-5v10z" />
          </svg>
        </Link>
      </div>
    );
  }

  // Cart content
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Danh sách sản phẩm */}
      <section className="lg:col-span-2 rounded-xl border bg-white p-4 md:p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-orange-600">Giỏ hàng</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/product"
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            >
              ← Tiếp tục mua sắm
            </Link>
            <button
              onClick={clearCart}
              disabled={busy}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Xóa tất cả
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-3 font-semibold">Sản phẩm</th>
                <th className="px-3 py-3 font-semibold">Đơn giá</th>
                <th className="px-3 py-3 font-semibold">Số lượng</th>
                <th className="px-3 py-3 font-semibold">Thành tiền</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.product_id} className="border-t">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.img || "/logo.png"}
                        alt={item.name}
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          Mã: {item.product_id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{formatVND(item.price)}</td>
                  <td className="px-3 py-3">
                    <div className="inline-flex items-center rounded-lg border">
                      <button
                        type="button"
                        onClick={() => decreaseQty(item.product_id)}
                        disabled={busy || item.qty <= 1}
                        className="px-2 py-1 hover:bg-gray-50 disabled:opacity-60"
                      >
                        –
                      </button>
                      <input
                        type="number"
                        value={item.qty}
                        readOnly
                        className="w-10 border-x px-2 py-1 text-center"
                      />
                      <button
                        type="button"
                        onClick={() => increaseQty(item.product_id)}
                        disabled={busy || item.qty >= 99}
                        className="px-2 py-1 hover:bg-gray-50 disabled:opacity-60"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-semibold text-gray-900">
                    {formatVND(item.price * item.qty)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => removeItem(item.product_id)}
                      disabled={busy}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tổng kết */}
      <aside className="h-fit rounded-xl border bg-white p-5 shadow-sm lg:sticky lg:top-20">
        <h2 className="mb-4 text-xl font-bold">Tổng kết</h2>
        
        {/* Mã giảm giá */}
        <div className="mb-4 space-y-3">
          {appliedCoupon ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-green-700">
                    Mã: {appliedCoupon.code}
                  </span>
                  {appliedCoupon.free_ship ? (
                    <p className="text-xs text-green-600 mt-1">Miễn phí vận chuyển</p>
                  ) : (
                    <p className="text-xs text-green-600 mt-1">
                      Giảm {formatVND(appliedCoupon.discount_amount)}
                    </p>
                  )}
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Xóa
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCoupon();
                    }
                  }}
                  placeholder="Nhập mã giảm giá"
                  className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                  disabled={couponLoading || items.length === 0}
                />
                <button
                  onClick={applyCoupon}
                  disabled={couponLoading || items.length === 0}
                  className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {couponLoading ? "..." : "Áp dụng"}
                </button>
              </div>
              {couponMessage && !appliedCoupon && (
                <p className="text-xs text-red-600">{couponMessage}</p>
              )}
            </div>
          )}

          {/* Danh sách mã giảm giá có sẵn */}
          {!appliedCoupon && items.length > 0 && availableCoupons.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-orange-700">
                  Mã giảm giá hiện có
                </span>
                <button
                  onClick={() => setShowCouponSuggestions(!showCouponSuggestions)}
                  className="text-xs text-orange-600 hover:text-orange-700"
                >
                  {showCouponSuggestions ? "Ẩn" : "Xem"}
                </button>
              </div>
              
              {showCouponSuggestions && (
                <div className="space-y-2 mt-2">
                  {loadingCoupons ? (
                    <p className="text-xs text-gray-500">Đang tải...</p>
                  ) : (
                    availableCoupons.slice(0, 3).map((coupon) => (
                      <div
                        key={coupon.id}
                        className="flex items-center justify-between rounded border border-orange-200 bg-white p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-orange-600">
                              {coupon.code}
                            </span>
                            {coupon.min_order_amount && (
                              <span className="text-xs text-gray-500">
                                (Đơn từ {formatVND(coupon.min_order_amount)})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {getCouponDescription(coupon)}
                          </p>
                          {coupon.description && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {coupon.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => applySuggestedCoupon(coupon)}
                          disabled={couponLoading}
                          className="ml-2 rounded bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50 whitespace-nowrap"
                        >
                          {couponLoading ? "..." : "Dùng ngay"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-2 flex items-center justify-between text-sm text-gray-700">
          <span>Tạm tính</span>
          <span>{formatVND(subtotal)}</span>
        </div>
        
        {discount > 0 && (
          <div className="mb-2 flex items-center justify-between text-sm text-green-600">
            <span>Giảm giá</span>
            <span>-{formatVND(discount)}</span>
          </div>
        )}
        
        <div className="mb-2 flex items-center justify-between text-sm text-gray-700">
          <span>Vận chuyển</span>
          <span>
            {shipping === 0 ? (
              <span className="text-green-600">Miễn phí</span>
            ) : (
              formatVND(shipping)
            )}
          </span>
        </div>
        <div className="my-3 border-t" />
        <div className="mb-4 flex items-center justify-between text-lg font-extrabold text-gray-900">
          <span>Tổng cộng</span>
          <span>{formatVND(total)}</span>
        </div>

        <button
          onClick={goCheckout}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
        >
          Thanh toán
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 17l5-5-5-5v10z" />
          </svg>
        </button>

        <p className="mt-3 text-center text-xs text-gray-500">
          Thuế VAT (nếu có) sẽ hiển thị ở bước thanh toán.
        </p>
      </aside>
    </div>
  );
}
