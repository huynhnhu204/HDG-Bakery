"use client";

import { useState, useEffect } from "react";
import { X, Gift } from "lucide-react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

export default function CouponBanner() {
  const [coupons, setCoupons] = useState([]);
  const [show, setShow] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCoupons() {
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
  }, []);

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

  const handleUseNow = (code) => {
    window.location.href = "/cart";
  };

  if (!show || loading || coupons.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-4 relative">
      <div className="container mx-auto flex items-center justify-center gap-4 flex-wrap text-sm">
        <Gift className="w-4 h-4" />
        <span className="font-medium">Ưu đãi hôm nay:</span>
        <div className="flex items-center gap-2 flex-wrap">
          {coupons.slice(0, 3).map((coupon) => {
            const condition = coupon.min_order_amount 
              ? `đơn từ ${(coupon.min_order_amount / 1000).toFixed(0)}k` 
              : "";
            const timeInfo = coupon.time_restriction ? `— ${coupon.time_restriction}` : "";
            
            return (
              <span key={coupon.id} className="flex items-center gap-1">
                {condition} 
                {condition && timeInfo ? " " : ""}
                {timeInfo}
                <code className="font-bold px-2 py-0.5 bg-white/20 rounded">{coupon.code}</code>
                <button
                  onClick={() => handleSaveCoupon(coupon.code)}
                  className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium"
                >
                  Lấy mã
                </button>
              </span>
            );
          })}
        </div>
      </div>
      <button
        onClick={() => setShow(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 hover:bg-white/20 rounded p-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

