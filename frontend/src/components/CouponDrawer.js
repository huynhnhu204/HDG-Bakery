"use client";

import { useState, useEffect } from "react";
import { Gift, X, Clock, Star } from "lucide-react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

export default function CouponDrawer() {
  const [open, setOpen] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchCoupons() {
      if (!open) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/coupons/public`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setCoupons(data.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch coupons:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchCoupons();
  }, [open]);

  const handleSaveCoupon = (code) => {
    try {
      const saved = JSON.parse(localStorage.getItem("saved_coupons") || "[]");
      if (!saved.includes(code)) {
        saved.push(code);
        localStorage.setItem("saved_coupons", JSON.stringify(saved));
        alert(`✅ Đã lưu mã ${code}. Mã sẽ tự áp ở bước thanh toán khi đủ điều kiện.`);
      }
    } catch (e) {
      console.error("Failed to save coupon:", e);
    }
  };

  const handleUseNow = () => {
    window.location.href = "/cart";
  };

  return (
    <>
      {/* Nút nổi */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-full shadow-lg flex items-center gap-2 group animate-bounce hover:animate-none"
        title="Ưu đãi"
      >
        <Gift className="w-6 h-6" />
        <span className="text-sm font-semibold hidden md:inline">Ưu đãi</span>
      </button>

      {/* Ngăn kéo */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="bg-black/50 flex-1"
            onClick={() => setOpen(false)}
          />
          
          {/* Drawer */}
          <div className="bg-white w-full max-w-md h-full overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Gift className="w-6 h-6" />
                Ví ưu đãi
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="hover:bg-white/20 rounded p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {loading ? (
                <div className="text-center py-12 text-gray-500">Đang tải...</div>
              ) : coupons.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Gift className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Hiện chưa có mã ưu đãi nào.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {coupons.map((coupon) => {
                    const condition = coupon.min_order_amount 
                      ? `đơn ≥ ${(coupon.min_order_amount / 1000).toFixed(0)}k` 
                      : "không giới hạn";
                    
                    const discountText = coupon.discount_type === "percent" 
                      ? `Giảm ${coupon.discount_value}%`
                      : coupon.discount_type === "fixed"
                      ? `Giảm ${(coupon.discount_value / 1000).toFixed(0)}k`
                      : "Miễn phí vận chuyển";

                    const endDate = coupon.end_date ? new Date(coupon.end_date) : null;
                    const isExpiring = endDate && endDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;

                    return (
                      <div
                        key={coupon.id}
                        className="border-2 border-orange-200 rounded-xl p-4 bg-gradient-to-br from-orange-50 to-white"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg text-orange-700">{coupon.name || coupon.code}</h3>
                            {coupon.description && (
                              <p className="text-sm text-gray-600">{coupon.description}</p>
                            )}
                          </div>
                          <code className="font-mono font-bold text-orange-600 bg-white px-2 py-1 rounded">
                            {coupon.code}
                          </code>
                        </div>

                        {/* Content */}
                        <div className="space-y-1 text-sm text-gray-700 mb-3">
                          <p>💡 {discountText}</p>
                          <p className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Điều kiện: {condition}
                          </p>
                          {coupon.time_restriction && (
                            <p className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Giờ: {coupon.time_restriction}
                            </p>
                          )}
                          {endDate && (
                            <p className={isExpiring ? "text-red-600 font-medium" : ""}>
                              Hết hạn: {endDate.toLocaleDateString("vi-VN")}
                              {isExpiring && " (Sắp hết hạn!)"}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveCoupon(coupon.code)}
                            className="flex-1 px-4 py-2 bg-white border-2 border-orange-500 text-orange-600 rounded-lg font-semibold hover:bg-orange-50"
                          >
                            Lấy mã
                          </button>
                          <button
                            onClick={handleUseNow}
                            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600"
                          >
                            Dùng ngay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

