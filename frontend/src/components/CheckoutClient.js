// src/components/CheckoutClient.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ================= Config ================= */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const WITH_CREDENTIALS = false; // true => "include" nếu đã cấu hình cookie CORS
const CART_GET   = `${API_BASE}/api/v1/cart`;
const CART_CLEAR = `${API_BASE}/api/v1/cart/clear`;
const ORDER_POST = `${API_BASE}/api/v1/orders`;
const THANK_YOU_URL = process.env.NEXT_PUBLIC_THANK_YOU_URL || "/thank-you";

/* ==== Profile API (để auto-fill) ==== */
const TOKEN_KEY = "auth_token";
const API_V1 = `${API_BASE}/api/v1`;
async function apiMe(token) {
  const r = await fetch(`${API_V1}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  return j;
}
function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
async function apiMyMembership(token) {
  if (!token) throw new Error('no-token');
  const r = await fetch(`${API_V1}/membership/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  const j = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  return j;
}

/* ==== Thông tin ngân hàng để tạo VietQR (đổi đúng của bạn) ==== */
const BANK_BIN       = "970423";
const BANK_ACCOUNTNO = "02904676767";
const BANK_ACC_NAME  = "Duong Dao Huynh Nhu";

/* ================= Helpers ================= */
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";

function readLocalCartFallback() {
  try {
    const keys = ["cart", "cart_items", "cartItems", "CART", "CART_ITEMS"];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed?.items) ? parsed.items : (Array.isArray(parsed) ? parsed : []);
      if (list.length) {
        return list.map((it, i) => ({
          id: it.product_id ?? it.id ?? i,
          name: it.name ?? it.product?.name ?? `SP ${i + 1}`,
          price: Number(it.price ?? it.product?.price_sale ?? it.product?.price_buy ?? 0),
          qty: Number(it.qty ?? it.quantity ?? 1),
          image: it.image ?? it.thumbnail ?? it.product?.thumbnail ?? null,
        }));
      }
    }
  } catch {}
  return [];
}

/** Tạo URL ảnh VietQR với số tiền & nội dung điền sẵn */
function buildVietQR({ bin, accountNo, accountName, amount, content }) {
  const qs = new URLSearchParams({
    amount: String(Math.round(Number(amount || 0))),
    addInfo: content || "",
    accountName: accountName || "",
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(bin)}-${encodeURIComponent(accountNo)}-compact2.png?${qs.toString()}`;
}

/** Tách địa chỉ full "A, P/X, Q/H, Tỉnh" → {street, wardName, districtName, provinceName}  */
function parseAddressLoose(address) {
  if (!address) return { street: "", wardName: "", districtName: "", provinceName: "" };
  const parts = String(address).split(",").map(s => s.trim()).filter(Boolean);
  if (!parts.length) return { street: address, wardName: "", districtName: "", provinceName: "" };
  const provinceName = parts[parts.length - 1] || "";
  const districtName = parts[parts.length - 2] || "";
  const wardName     = parts[parts.length - 3] || "";
  const street       = parts.slice(0, Math.max(1, parts.length - 3)).join(", ");
  return { street, wardName, districtName, provinceName };
}

/* ================= Component ================= */
export default function CheckoutClient() {
  const router = useRouter();

  const [loading, setLoading]   = useState(false);
  const [items, setItems]       = useState([]);
  const [payment, setPayment]   = useState("COD"); // COD | QR
  const [err, setErr]           = useState("");

  // Coupon/Discount code state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Modal QR (giữ chức năng cũ)
  const [showQR, setShowQR]     = useState(false);
  const [qrUrl, setQrUrl]       = useState("");
  const [currentOrder, setCurrentOrder] = useState(null);
  // Membership (hint)
  const [member, setMember] = useState(null);

  // 🔸 Toggle: dùng hồ sơ hay nhập mới
  const [useProfile, setUseProfile] = useState(false);
  const [profileAvailable, setProfileAvailable] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  /* ---------------- Địa chỉ VN (provinces API) ---------------- */
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards]         = useState([]);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    street: "",     // số nhà, tên đường
    province: "",   // code tỉnh
    district: "",   // code quận
    ward: "",       // code phường
    note: "",
  });

  // Lấy giỏ: BE (session) -> fallback local
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(CART_GET, {
          method: "GET",
          cache: "no-store",
          credentials: WITH_CREDENTIALS ? "include" : "omit",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Cart API ${res.status}`);

        const raw = await res.json().catch(() => ({}));
        const list = Array.isArray(raw) ? raw : raw?.data || raw?.items || [];
        const normalized = list.map((it, i) => ({
          id: it.product_id ?? it.id ?? i,
          name: it.name ?? it.product?.name ?? `SP ${i + 1}`,
          price: Number(it.price ?? it.product?.price_sale ?? it.product?.price_buy ?? 0),
          qty: Number(it.qty ?? it.quantity ?? 1),
          image: it.image ?? it.thumbnail ?? it.product?.thumbnail ?? null,
        }));
        if (!alive) return;
        setItems(normalized.length ? normalized : readLocalCartFallback());
      } catch (e) {
        if (!alive) return;
        const fb = readLocalCartFallback();
        if (fb.length) setItems(fb);
        setErr(e?.message || "Không tải được giỏ hàng, dùng giỏ cục bộ.");
      }
    })();
    return () => { alive = false; };
  }, []);

  // Tự động load và validate coupon từ localStorage (từ cart page)
  useEffect(() => {
    if (!items.length || appliedCoupon) return;

    async function autoApplyCouponFromCart() {
      try {
        // Đọc coupon từ localStorage (được lưu từ cart page)
        const savedCoupon = localStorage.getItem("applied_coupon");
        if (!savedCoupon) return;

        const couponData = JSON.parse(savedCoupon);
        if (!couponData || !couponData.code) return;

        // Tính subtotal hiện tại
        const currentSubtotal = items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);

        // Lấy thông tin user nếu có
        const token = (() => {
          try { return localStorage.getItem("auth_token"); } catch { return null; }
        })();

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

        // Validate coupon với giỏ hàng hiện tại
        const validateRes = await fetch(`${API_BASE}/api/v1/coupons/validate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            code: couponData.code,
            subtotal: currentSubtotal,
            cart_items: items.map((it) => ({
              product_id: it.id,
              qty: it.qty,
              price: it.price,
            })),
            user_id: userId,
            email: email || form.email || "",
            phone: phone || form.phone || "",
          }),
        });

        if (!validateRes.ok) {
          // Nếu validate thất bại, xóa coupon khỏi localStorage
          localStorage.removeItem("applied_coupon");
          return;
        }

        const validated = await validateRes.json();

        if (validated.valid && validated.coupon) {
          // Cập nhật coupon với discount amount mới (có thể khác với cart page nếu items thay đổi)
          setAppliedCoupon(validated.coupon);
          setCouponCode(couponData.code);
          setCouponMessage(`✅ Đã áp dụng mã ${couponData.code}: -${vnd(validated.coupon.discount_amount || 0)}`);
          // Cập nhật lại localStorage với coupon đã validate
          localStorage.setItem("applied_coupon", JSON.stringify(validated.coupon));
        } else {
          // Coupon không còn hợp lệ, xóa khỏi localStorage
          localStorage.removeItem("applied_coupon");
          setCouponMessage(validated.message || "Mã giảm giá không còn hợp lệ");
        }
      } catch (e) {
        console.error("Failed to auto-apply coupon from cart:", e);
        // Nếu có lỗi, vẫn giữ coupon trong localStorage để user có thể thử lại
      }
    }

    autoApplyCouponFromCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Load membership for hint
  useEffect(() => {
    let alive = true;
    const token = getToken();
    if (!token) return;
    apiMyMembership(token).then(j => { if (alive) setMember(j || null); }).catch(()=>{});
    return () => { alive = false; };
  }, []);

  // Lấy tỉnh/thành
  useEffect(() => {
    let alive = true;
    fetch("https://provinces.open-api.vn/api/p/")
      .then((res) => res.json())
      .then((data) => alive && setProvinces(Array.isArray(data) ? data : []))
      .catch(() => {}); // nuốt lỗi để không chặn checkout
    return () => { alive = false; };
  }, []);

  // Lấy quận/huyện khi chọn tỉnh
  useEffect(() => {
    let alive = true;
    if (form.province) {
      fetch(`https://provinces.open-api.vn/api/p/${form.province}?depth=2`)
        .then((res) => res.json())
        .then((data) => {
          if (!alive) return;
          setDistricts(data?.districts || []);
          setWards([]);
          setForm((f) => ({ ...f, district: "", ward: "" }));
        })
        .catch(() => {
          if (!alive) return;
          setDistricts([]); setWards([]);
        });
    } else {
      setDistricts([]); setWards([]);
      setForm((f) => ({ ...f, district: "", ward: "" }));
    }
    return () => { alive = false; };
  }, [form.province]);

  // Lấy xã/phường khi chọn quận
  useEffect(() => {
    let alive = true;
    if (form.district) {
      fetch(`https://provinces.open-api.vn/api/d/${form.district}?depth=2`)
        .then((res) => res.json())
        .then((data) => {
          if (!alive) return;
          setWards(data?.wards || []);
          setForm((f) => ({ ...f, ward: "" }));
        })
        .catch(() => {
          if (!alive) return;
          setWards([]);
        });
    } else {
      setWards([]);
      setForm((f) => ({ ...f, ward: "" }));
    }
    return () => { alive = false; };
  }, [form.district]);

  // 🔸 Tự load hồ sơ (nếu có token)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = getToken();
        if (!token) { setProfileAvailable(false); return; }
        setProfileLoading(true);
        const me = await apiMe(token);
        if (!alive) return;

        const name  = me.customer?.name || me.user?.name || "";
        const email = me.user?.email || "";
        const phone = me.customer?.phone || "";
        const address = me.customer?.address || "";

        // Tách address ra hiển thị (chỉ để user xem cho rõ)
        const { street, wardName, districtName, provinceName } = parseAddressLoose(address);

        setForm((f) => ({
          ...f,
          name: name || f.name,
          email: email || f.email,
          phone: phone || f.phone,
          // Khi dùng hồ sơ, ta KHÔNG cần ép code tỉnh/quận/phường — giữ ở ô street hiển thị
          street: street || f.street,
          note: f.note,
        }));
        setProfileAvailable(Boolean(name || phone || address));
      } catch {
        setProfileAvailable(false);
      } finally {
        setProfileLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Nếu người dùng bật "Dùng hồ sơ" nhưng không có hồ sơ → tự chuyển về nhập tay
  useEffect(() => {
    if (useProfile && (!profileAvailable || profileLoading)) return; // chờ load xong
    if (useProfile && !profileAvailable) setUseProfile(false);
  }, [useProfile, profileAvailable, profileLoading]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0), [items]);
  
  // Calculate shipping (considering free ship coupon)
  const shipping = useMemo(() => {
    if (appliedCoupon?.free_ship) return 0;
    return subtotal >= 500_000 ? 0 : 30_000;
  }, [subtotal, appliedCoupon]);
  
  // Calculate discount amount
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    return appliedCoupon.discount_amount || 0;
  }, [appliedCoupon]);
  
  const total = subtotal - discountAmount + shipping;

  function findName(arr, code) {
    if (!code) return "";
    const c = String(code);
    const it = arr.find((x) => String(x?.code) === c);
    return it?.name || "";
  }

  async function clearCartEverywhere() {
    try {
      await fetch(CART_CLEAR, {
        method: "POST",
        credentials: WITH_CREDENTIALS ? "include" : "omit",
        headers: { Accept: "application/json" },
      });
    } catch {}
    try {
      // Set cart thành rỗng trước (để trigger storage event cho các tab khác)
      localStorage.setItem("cart", JSON.stringify({ items: [], updatedAt: Date.now() }));
      // Xóa các key khác nếu có
      const keys = ["cart_items", "cartItems", "CART", "CART_ITEMS"];
      keys.forEach((k) => localStorage.removeItem(k));
      // Dispatch event để các component khác (Header, CategoryMenu) cập nhật số lượng giỏ hàng về 0
      window.dispatchEvent(new Event("cart-updated"));
    } catch {}
  }

  // Apply coupon code
  async function applyCoupon() {
    if (!couponCode.trim()) {
      setCouponMessage("Vui lòng nhập mã giảm giá.");
      return;
    }

    setApplyingCoupon(true);
    setCouponMessage("");

    try {
      const token = (() => {
        try { return localStorage.getItem("auth_token"); } catch { return null; }
      })();

      const res = await fetch(`${API_BASE}/api/v1/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          cart_items: items,
          subtotal: subtotal,
          user_id: null, // Backend sẽ tự lấy từ token nếu cần
          email: form.email || "",
          phone: form.phone || "",
        }),
      });

      const data = await res.json();

      if (data.valid) {
        setAppliedCoupon(data.coupon);
        setCouponMessage(`✅ ${data.coupon.message || "Áp dụng mã thành công!"}`);
        setCouponCode(""); // Clear input after successful apply
        // Lưu vào localStorage để đồng bộ với cart page
        localStorage.setItem("applied_coupon", JSON.stringify(data.coupon));
      } else {
        setCouponMessage(`❌ ${data.message || "Mã không hợp lệ."}`);
        setAppliedCoupon(null);
        localStorage.removeItem("applied_coupon");
      }
    } catch (e) {
      setCouponMessage("❌ Lỗi kết nối, vui lòng thử lại.");
      setAppliedCoupon(null);
    } finally {
      setApplyingCoupon(false);
    }
  }

  // Remove coupon
  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponMessage("");
    localStorage.removeItem("applied_coupon");
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!items.length) return setErr("Giỏ hàng trống.");

    setLoading(true);
    setErr("");

    // ✅ KIỂM TRA TỒN KHO TRƯỚC KHI ĐẶT HÀNG
    try {
      const stockCheckRes = await fetch(`${API_BASE}/api/v1/products/check-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(it => ({ product_id: it.id, qty: it.qty }))
        })
      });
      
      if (stockCheckRes.ok) {
        const stockResult = await stockCheckRes.json();
        if (stockResult.unavailable && stockResult.unavailable.length > 0) {
          const unavailableNames = stockResult.unavailable.map(item => item.name).join(", ");
          setErr(`Xin lỗi, số lượng không đủ để chốt đơn. Một số sản phẩm đã hết hoặc không đủ số lượng: ${unavailableNames}`);
          setLoading(false);
          return;
        }
      }
    } catch (stockErr) {
      console.warn("Stock check failed, proceeding anyway:", stockErr);
    }

    // Nếu dùng hồ sơ: address sẽ lấy từ hồ sơ (đã push vào form.street + phần còn lại) — nhưng
    // vì BE đang nhận 1 chuỗi address, ta ưu tiên: nếu useProfile và user có address trong hồ sơ
    // thì lấy thẳng address trong hồ sơ từ session/me. Ở đây, để đơn giản, ta fallback:
    // - nếu dùng hồ sơ: ghép từ street + (ward/district/province nếu user có chọn thêm)
    // - nếu nhập tay: ghép như cũ (bắt buộc chọn đủ tỉnh/quận/phường)
    const provinceName = findName(provinces, form.province);
    const districtName = findName(districts, form.district);
    const wardName     = findName(wards, form.ward);

    const composedAddressManual = [form.street?.trim(), wardName, districtName, provinceName]
      .filter(Boolean).join(", ");

    // Ràng buộc
    const errs = [];
    if (!form.name?.trim()) errs.push("Họ tên");
    if (!form.phone?.trim()) errs.push("SĐT");

    let addressToUse = "";
    if (useProfile) {
      // Dùng hồ sơ: không bắt buộc code tỉnh/quận/phường (vì có thể address đã là chuỗi đầy đủ)
      // Nếu người dùng có điền/giữ lại street → dùng luôn; nếu rỗng → vẫn yêu cầu.
      addressToUse = composedAddressManual || form.street?.trim();
      if (!addressToUse) errs.push("Địa chỉ (từ hồ sơ)");
    } else {
      // Nhập tay: bắt buộc tỉnh/quận/phường
      if (!form.province) errs.push("Tỉnh/Thành");
      if (!form.district) errs.push("Quận/Huyện");
      if (!form.ward) errs.push("Phường/Xã");
      if (!composedAddressManual) errs.push("Địa chỉ");
      addressToUse = composedAddressManual;
    }

    if (errs.length) {
      setErr("Vui lòng nhập: " + errs.join(", "));
      setLoading(false);
      return;
    }

    try {
      // ✅ Lấy token (nếu có) và đính kèm Authorization để BE gắn user_id
      const token = (() => {
        try { return localStorage.getItem("auth_token"); } catch { return null; }
      })();

      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || undefined,
        address: addressToUse,
        note: form.note?.trim() || undefined,
        payment_method: (payment === "QR" ? "Bank" : "COD"),
        items: items.map((it) => ({
          product_id: it.id ? Number(it.id) : undefined,
          name: it.id ? undefined : it.name,
          qty: Number(it.qty),
          price: Number(it.price),
        })),
        // Add coupon information if applied
        ...(appliedCoupon ? {
          coupon_id: appliedCoupon.id,
          coupon_code: appliedCoupon.code,
        } : {}),
      };

      // 1) Tạo đơn
      const res = await fetch(ORDER_POST, {
        method: "POST",
        credentials: WITH_CREDENTIALS ? "include" : "omit",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Order API ${res.status}`);
      const order = await res.json().catch(() => ({}));
      setCurrentOrder(order);

      // 2) Xoá giỏ và coupon
      await clearCartEverywhere();
      localStorage.removeItem("applied_coupon");

      // 3) Chuẩn bị dữ liệu + lưu để trang Thank You đọc
      const amount  = Number(order?.total ?? total);
      const code    = order?.code || order?.id || "";
      const content = code ? `Thanh toan ${code}` : "Thanh toan don hang";
      const qr      = buildVietQR({
        bin: BANK_BIN,
        accountNo: BANK_ACCOUNTNO,
        accountName: BANK_ACC_NAME,
        amount,
        content,
      });

      const info = {
        order: code,
        total: amount,
        method: payment, // "COD" | "QR"
        qr: payment === "QR" ? qr : "",
        bank: { name: BANK_ACC_NAME, accountNo: BANK_ACCOUNTNO },
      };
      try { sessionStorage.setItem("last_order_info", JSON.stringify(info)); } catch {}

      const qs = new URLSearchParams({
        order: String(info.order || ""),
        total: String(info.total || ""),
        method: String(info.method || ""),
        qr: info.qr || "",
      });

      // 4) Điều hướng:
      if (payment === "COD") {
        router.replace(`${THANK_YOU_URL}?${qs.toString()}`);
        return;
      }

      // QR → mở modal QR tại trang này
      setQrUrl(qr);
      setShowQR(true);
    } catch (e) {
      setErr(e?.message || "Thanh toán thất bại, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
        {/* Form */}
        <form onSubmit={onSubmit} className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-lg">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Thông tin giao hàng</h2>
            </div>

            {/* 🔸 Chọn nguồn thông tin */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-orange-50/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-semibold text-gray-800">Nguồn thông tin người nhận</span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <label className="group flex cursor-pointer items-center gap-3 rounded-lg border-2 border-transparent bg-white p-3 transition-all hover:border-orange-300 hover:shadow-md">
                  <input
                    type="radio"
                    name="addr_src"
                    value="profile"
                    checked={useProfile}
                    onChange={() => setUseProfile(true)}
                    disabled={!profileAvailable && !profileLoading}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="font-medium text-gray-700">Dùng thông tin hồ sơ</span>
                  {profileLoading && <span className="ml-auto text-xs text-gray-500">(đang tải…)</span>}
                  {!profileLoading && !profileAvailable && (
                    <span className="ml-auto text-xs text-red-600">(chưa đăng nhập)</span>
                  )}
                </label>

                <label className="group flex cursor-pointer items-center gap-3 rounded-lg border-2 border-transparent bg-white p-3 transition-all hover:border-orange-300 hover:shadow-md">
                  <input
                    type="radio"
                    name="addr_src"
                    value="manual"
                    checked={!useProfile}
                    onChange={() => setUseProfile(false)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="font-medium text-gray-700">Nhập thông tin khác</span>
                </label>

                <Link href="/profile" className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-orange-600 underline-offset-2 transition-colors hover:text-orange-700">
                  Cập nhật hồ sơ
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {err && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <svg className="h-5 w-5 flex-shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{err}</span>
              </div>
            )}

            {/* Họ tên + SĐT */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-10 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Nguyễn Văn A"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    disabled={useProfile}
                  />
                  <svg className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    required
                    type="tel"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-10 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="0901 234 567"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    disabled={useProfile}
                  />
                  <svg className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Email</label>
              <div className="relative">
                <input
                  type="email"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-10 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="email@domain.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  disabled={useProfile}
                />
                <svg className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Địa chỉ: Tỉnh/Quận/Phường – nếu dùng hồ sơ, cho phép xem/khóa */}
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Tỉnh/Thành {!useProfile && <span className="text-red-500">*</span>}
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={form.province}
                  onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                  required={!useProfile}
                  disabled={useProfile}
                >
                  <option value="">{useProfile ? "Đang dùng hồ sơ" : "-- Chọn tỉnh/thành --"}</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Quận/Huyện {!useProfile && <span className="text-red-500">*</span>}
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={form.district}
                  onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                  required={!useProfile}
                  disabled={useProfile || !form.province}
                >
                  <option value="">{useProfile ? "Đang dùng hồ sơ" : (form.province ? "-- Chọn quận/huyện --" : "Chọn tỉnh trước")}</option>
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Phường/Xã {!useProfile && <span className="text-red-500">*</span>}
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={form.ward}
                  onChange={(e) => setForm((f) => ({ ...f, ward: e.target.value }))}
                  required={!useProfile}
                  disabled={useProfile || !form.district}
                >
                  <option value="">{useProfile ? "Đang dùng hồ sơ" : (form.district ? "-- Chọn phường/xã --" : "Chọn quận trước")}</option>
                  {wards.map((w) => (
                    <option key={w.code} value={w.code}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Số nhà, đường */}
            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Địa chỉ (Số nhà, đường) {!useProfile && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  required={!useProfile}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-10 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder={useProfile ? "Đang dùng địa chỉ từ hồ sơ (có thể để nguyên)" : "123 Đường ABC"}
                  value={form.street}
                  onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                  disabled={useProfile}
                />
                <svg className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              {useProfile && (
                <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Địa chỉ lấy theo hồ sơ. Muốn chỉnh sửa? Hãy cập nhật ở trang hồ sơ.
                </p>
              )}
            </div>

            {/* Ghi chú */}
            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Ghi chú</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                placeholder="Giao giờ hành chính, gọi trước 15 phút…"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-lg">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Phương thức thanh toán</h2>
            </div>
            <div className="space-y-3">
              <label className="group flex cursor-pointer items-center gap-4 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 transition-all hover:border-orange-300 hover:bg-orange-50/50 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                <input
                  type="radio"
                  name="pay"
                  value="COD"
                  checked={payment === "COD"}
                  onChange={() => setPayment("COD")}
                  className="h-5 w-5 text-orange-600 focus:ring-orange-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Thanh toán khi nhận hàng (COD)</div>
                  <div className="mt-1 text-sm text-gray-600">Thanh toán bằng tiền mặt khi nhận hàng</div>
                </div>
                <svg className="h-6 w-6 text-gray-400 group-has-[:checked]:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </label>
              <label className="group flex cursor-pointer items-center gap-4 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 transition-all hover:border-orange-300 hover:bg-orange-50/50 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                <input
                  type="radio"
                  name="pay"
                  value="QR"
                  checked={payment === "QR"}
                  onChange={() => setPayment("QR")}
                  className="h-5 w-5 text-orange-600 focus:ring-orange-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Chuyển khoản QR (VietQR)</div>
                  <div className="mt-1 text-sm text-gray-600">Quét mã QR để thanh toán nhanh chóng</div>
                </div>
                <svg className="h-6 w-6 text-gray-400 group-has-[:checked]:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 font-bold text-white shadow-lg transition-all hover:from-orange-700 hover:to-orange-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang xử lý…
                </span>
              ) : (
                payment === "QR" ? "Tạo đơn & hiển thị QR" : "Đặt hàng ngay"
              )}
            </button>
          </section>
        </form>

        {/* Tóm tắt */}
        <aside className="sticky top-6 h-fit rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-lg">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Đơn hàng của bạn</h2>
          </div>
          {!items.length ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-3 text-sm font-medium text-gray-700">Giỏ hàng trống</p>
              <p className="mt-1 text-xs text-gray-500">Vui lòng thêm sản phẩm vào giỏ hàng</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-gray-200">
              {items.map((it) => (
                <li key={String(it.id)} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {it.image && (
                      <img src={it.image} alt={it.name} className="h-12 w-12 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{it.name}</div>
                      <div className="text-xs text-gray-500">SL: {it.qty}</div>
                    </div>
                  </div>
                  <div className="font-semibold text-gray-900 whitespace-nowrap">{vnd(Number(it.price) * Number(it.qty))}</div>
                </li>
              ))}
            </ul>

            {/* Discount code input */}
            <div className="my-6 space-y-3">
              {appliedCoupon ? (
                <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-800">Mã: {appliedCoupon.code}</p>
                        <p className="text-xs text-green-600">{appliedCoupon.name}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
                    >
                      Bỏ mã
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập mã giảm giá"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyCoupon();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={applyingCoupon || !couponCode.trim()}
                      className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {applyingCoupon ? (
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : "Áp dụng"}
                    </button>
                  </div>
                  {couponMessage && (
                    <p className={`flex items-center gap-2 text-xs font-medium ${couponMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                      {couponMessage.includes('✅') ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {couponMessage.replace(/[✅❌]/g, '').trim()}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="my-4 border-t border-gray-200" />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Tạm tính</span>
                <span className="font-medium">{vnd(subtotal)}</span>
              </div>
              
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm font-semibold text-green-600">
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Giảm giá
                  </span>
                  <span>-{vnd(discountAmount)}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Phí vận chuyển
                </span>
                <span className={`font-medium ${shipping === 0 ? 'text-green-600' : ''}`}>
                  {shipping === 0 ? "Miễn phí" : vnd(shipping)}
                </span>
              </div>
            </div>

            <div className="my-4 border-t-2 border-gray-300" />
            <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-orange-50 to-orange-100/50 p-4">
              <span className="text-lg font-bold text-gray-900">Tổng cộng</span>
              <span className="text-2xl font-extrabold text-orange-600">{vnd(currentOrder?.total ?? total)}</span>
            </div>

            {/* Membership hint */}
            {member && (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100">
                  <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-orange-900">Hạng {member.label}</div>
                  <div className="mt-1 text-xs text-orange-700">{member.benefits?.[0] || 'Ưu đãi thành viên áp dụng.'}</div>
                </div>
              </div>
            )}

              <div className="mt-6">
                <Link href="/cart" className="flex items-center gap-2 text-sm font-medium text-orange-600 transition-colors hover:text-orange-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Quay lại giỏ hàng
                </Link>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ========== Modal QR (giữ chức năng cũ) ========== */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                  <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Quét QR để thanh toán</h3>
              </div>
              <button
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                onClick={() => setShowQR(false)}
                aria-label="Close"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6 rounded-xl bg-gray-50 p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Mã đơn:</span>
                <span className="font-bold text-gray-900">{currentOrder?.code || currentOrder?.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Số tiền:</span>
                <span className="font-bold text-orange-600">{vnd(currentOrder?.total ?? subtotal + shipping)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Tài khoản nhận:</span>
                <span className="font-medium text-gray-900">{BANK_ACC_NAME}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Số tài khoản:</span>
                <span className="font-mono font-medium text-gray-900">{BANK_ACCOUNTNO}</span>
              </div>
            </div>

            <div className="mb-6 flex justify-center rounded-xl bg-gray-50 p-4">
              <div className="relative">
                <img
                  src={qrUrl}
                  alt="QR chuyển khoản"
                  className="h-64 w-64 rounded-lg border-2 border-gray-200 object-contain bg-white p-2 shadow-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80 opacity-0 transition-opacity hover:opacity-100">
                  <a
                    href={qrUrl}
                    download={`QR-${currentOrder?.code || currentOrder?.id}.png`}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
                  >
                    Tải xuống
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Nút xác nhận đã chuyển khoản → sang Thank You */}
              <button
                onClick={() => {
                  try {
                    const infoRaw = sessionStorage.getItem("last_order_info");
                    const info = infoRaw ? JSON.parse(infoRaw) : null;
                    const qs = new URLSearchParams({
                      order: String(info?.order || currentOrder?.code || currentOrder?.id || ""),
                      total: String(info?.total || currentOrder?.total || subtotal + shipping),
                      method: "QR",
                      qr: String(info?.qr || qrUrl || ""),
                    });
                    window.location.replace(`${THANK_YOU_URL}?${qs.toString()}`);
                  } catch {
                    window.location.replace(THANK_YOU_URL);
                  }
                }}
                className="rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-3 text-white font-semibold shadow-lg transition-all hover:from-orange-700 hover:to-orange-800 hover:shadow-xl"
              >
                Đã chuyển khoản
              </button>

              {/* Nút xem trang cảm ơn ngay */}
              <button
                onClick={() => {
                  try {
                    const infoRaw = sessionStorage.getItem("last_order_info");
                    const info = infoRaw ? JSON.parse(infoRaw) : null;
                    const qs = new URLSearchParams({
                      order: String(info?.order || currentOrder?.code || currentOrder?.id || ""),
                      total: String(info?.total || currentOrder?.total || subtotal + shipping),
                      method: "QR",
                      qr: String(info?.qr || qrUrl || ""),
                    });
                    window.location.assign(`${THANK_YOU_URL}?${qs.toString()}`);
                  } catch {
                    window.location.assign(THANK_YOU_URL);
                  }
                }}
                className="rounded-xl border-2 border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50"
              >
                Xem trang cảm ơn
              </button>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
              <svg className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-800">
                <strong>Lưu ý:</strong> Vui lòng ghi đúng nội dung và số tiền cần thanh toán khi chuyển khoản.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
