"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function formatVND(n) {
  return (Number(n) || 0).toLocaleString("vi-VN") + "đ";
}

export default function CartClient() {
  const [items, setItems] = useState([]);
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [percentOff, setPercentOff] = useState(0);
  const [freeShip, setFreeShip] = useState(false);
  const [shipping, setShipping] = useState("standard");

  // 🔹 Đọc localStorage động
  const loadCart = () => {
    try {
      const raw = localStorage.getItem("cart");
      if (!raw) {
        setItems([]);
        return;
      }
      const parsed = JSON.parse(raw);

      // có thể là mảng hoặc object {items: []}
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.items)
        ? parsed.items
        : [];

      setItems(list);
    } catch {
      setItems([]);
    }
  };

  // Lắng nghe sự kiện cập nhật giỏ hàng
  useEffect(() => {
    loadCart();
    window.addEventListener("cart-updated", loadCart);
    window.addEventListener("storage", loadCart);
    return () => {
      window.removeEventListener("cart-updated", loadCart);
      window.removeEventListener("storage", loadCart);
    };
  }, []);

  const saveCart = (list) => {
    try {
      localStorage.setItem("cart", JSON.stringify({ items: list, updatedAt: Date.now() }));
      window.dispatchEvent(new Event("cart-updated"));
    } catch {}
  };

  // 🧮 Tính toán
  const subtotal = useMemo(
    () => items.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0),
    [items]
  );
  const discount = Math.round((subtotal * percentOff) / 100);
  const shippingFee = useMemo(() => {
    if (freeShip) return 0;
    if (subtotal >= 500000) return 0;
    return shipping === "express" ? 45000 : 30000;
  }, [shipping, freeShip, subtotal]);
  const total = subtotal - discount + shippingFee;

  // 🧩 Hành động
  const inc = (id) => {
    const next = items.map((it) =>
      String(it.product_id || it.id) === String(id)
        ? { ...it, qty: Math.min(99, it.qty + 1) }
        : it
    );
    setItems(next);
    saveCart(next);
  };

  const dec = (id) => {
    const next = items
      .map((it) =>
        String(it.product_id || it.id) === String(id)
          ? { ...it, qty: Math.max(1, it.qty - 1) }
          : it
      )
      .filter(Boolean);
    setItems(next);
    saveCart(next);
  };

  const remove = (id) => {
    const next = items.filter((it) => String(it.product_id || it.id) !== String(id));
    setItems(next);
    saveCart(next);
  };

  const removeAll = () => {
    if (!confirm("Xoá toàn bộ giỏ hàng?")) return;
    setItems([]);
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("cart-updated"));
  };

  const applyCoupon = (e) => {
    e.preventDefault();
    const code = coupon.trim().toUpperCase();
    if (!code) {
      setCouponMsg("Vui lòng nhập mã giảm giá.");
      setPercentOff(0);
      setFreeShip(false);
      return;
    }
    if (code === "DOLA10") {
      setPercentOff(10);
      setFreeShip(false);
      setCouponMsg("Áp dụng mã DOLA10: Giảm 10%.");
    } else if (code === "FREESHIP") {
      setFreeShip(true);
      setPercentOff(0);
      setCouponMsg("Áp dụng mã FREESHIP: Miễn phí vận chuyển.");
    } else {
      setCouponMsg("Mã giảm giá không hợp lệ.");
      setPercentOff(0);
      setFreeShip(false);
    }
  };

  // 🛒 Nếu không có sản phẩm
  if (!items.length) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-2xl font-extrabold text-orange-600">Giỏ hàng trống</h1>
        <p className="text-gray-600">Chưa có sản phẩm nào. Hãy khám phá ưu đãi hấp dẫn của Dola Bakery!</p>
        <Link
          href="/product"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white hover:bg-orange-700"
        >
          Bắt đầu mua sắm
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 17l5-5-5-5v10z" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Danh sách sản phẩm */}
      <section className="lg:col-span-2 rounded-xl border bg-white p-4 md:p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-orange-600">Giỏ hàng của bạn</h1>
          <div className="flex items-center gap-3">
            <Link href="/product" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              ← Tiếp tục mua sắm
            </Link>
            <button
              onClick={removeAll}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Xoá tất cả
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
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.product_id || it.id} className="border-t">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={it.thumb || it.img || "/slide1.jpg"}
                        alt={it.name}
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{it.name}</p>
                        <p className="text-xs text-gray-500">
                          Mã: {it.product_id || it.id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{formatVND(it.price)}</td>
                  <td className="px-3 py-3">
                    <div className="inline-flex items-center rounded-lg border">
                      <button onClick={() => dec(it.product_id || it.id)} className="px-2 py-1">
                        –
                      </button>
                      <input
                        readOnly
                        value={it.qty}
                        className="w-10 border-x px-2 py-1 text-center"
                      />
                      <button onClick={() => inc(it.product_id || it.id)} className="px-2 py-1">
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-semibold text-gray-900">
                    {formatVND(it.price * it.qty)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => remove(it.product_id || it.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50"
                    >
                      Xoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Coupon + Shipping */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <form onSubmit={applyCoupon} className="rounded-lg border p-3">
            <label className="mb-1 block text-sm font-semibold">Mã giảm giá</label>
            <div className="flex gap-2">
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="VD: DOLA10, FREESHIP"
                className="w-full rounded-lg border px-3 py-2"
              />
              <button
                type="submit"
                className="rounded-lg bg-orange-600 px-3 py-2 text-white hover:bg-orange-700"
              >
                Áp dụng
              </button>
            </div>
            {couponMsg && <p className="mt-2 text-sm text-gray-600">{couponMsg}</p>}
          </form>

          <div className="rounded-lg border p-3">
            <p className="mb-2 text-sm font-semibold">Vận chuyển</p>
            <label className="mb-1 flex items-center gap-2">
              <input
                type="radio"
                name="ship"
                value="standard"
                checked={shipping === "standard"}
                onChange={() => setShipping("standard")}
              />
              Tiêu chuẩn — {subtotal >= 500000 || freeShip ? "Miễn phí" : "30.000đ"}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="ship"
                value="express"
                checked={shipping === "express"}
                onChange={() => setShipping("express")}
              />
              Hoả tốc — {subtotal >= 500000 || freeShip ? "Miễn phí" : "45.000đ"}
            </label>
          </div>
        </div>
      </section>

      {/* Tổng kết */}
      <aside className="h-fit rounded-xl border bg-white p-5 shadow-sm lg:sticky lg:top-20">
        <h2 className="mb-4 text-xl font-bold">Tổng kết đơn hàng</h2>
        <div className="flex justify-between text-sm text-gray-700 mb-2">
          <span>Tạm tính</span>
          <span>{formatVND(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-700 mb-2">
          <span>Giảm giá</span>
          <span className={discount ? "text-green-700 font-semibold" : ""}>−{formatVND(discount)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-700 mb-3">
          <span>Phí vận chuyển</span>
          <span>{formatVND(shippingFee)}</span>
        </div>
        <div className="border-t my-3" />
        <div className="flex justify-between text-lg font-extrabold mb-4">
          <span>Tổng cộng</span>
          <span>{formatVND(total)}</span>
        </div>
        <Link
          href="/checkout"
          className="block w-full text-center rounded-lg bg-orange-600 px-4 py-2.5 text-white font-semibold hover:bg-orange-700"
        >
          Tiến hành thanh toán
        </Link>
      </aside>
    </div>
  );
}
