"use client";

import { useState, useEffect } from "react";
import { Gift } from "lucide-react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

export default function ProductCoupons({ productId, categoryId }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCoupons() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/coupons/public`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          // Lọc mã áp cho sản phẩm này
          const applicable = data.data.filter((coupon) => {
            if (coupon.apply_to === "all") return true;
            if (coupon.apply_to === "product" && coupon.product_ids) {
              return coupon.product_ids.includes(productId);
            }
            if (coupon.apply_to === "category" && coupon.category_ids) {
              return coupon.category_ids.includes(categoryId);
            }
            return false;
          });
          setCoupons(applicable);
        }
      } catch (e) {
        console.error("Failed to fetch coupons:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchCoupons();
  }, [productId, categoryId]);

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

  if (loading || coupons.length === 0) return null;

  return (
    <div className="rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 mb-4">
      <div className="flex items-start gap-3">
        <Gift className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-orange-900 mb-1">Mã cho sản phẩm này:</h3>
          {coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-center gap-2 mb-2 last:mb-0">
              <code className="font-mono font-bold text-orange-600 bg-white px-2 py-1 rounded">
                {coupon.code}
              </code>
              <span className="text-sm text-gray-700">
                {coupon.description || coupon.name}
              </span>
              <button
                onClick={() => handleSaveCoupon(coupon.code)}
                className="ml-auto px-3 py-1 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600"
              >
                Lấy mã
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

