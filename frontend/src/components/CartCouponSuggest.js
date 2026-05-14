"use client";

import { useState, useEffect, useMemo } from "react";
import { Gift, Sparkles } from "lucide-react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

export default function CartCouponSuggest({ cartItems, subtotal }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedCoupons, setSavedCoupons] = useState([]);

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

    // Load saved coupons
    try {
      const saved = JSON.parse(localStorage.getItem("saved_coupons") || "[]");
      setSavedCoupons(saved);
    } catch (e) {
      setSavedCoupons([]);
    }
  }, []);

  // Check which coupons are eligible
  const eligibleCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
        return false;
      }
      // TODO: Check other conditions (product, category, etc.)
      return true;
    });
  }, [coupons, subtotal]);

  const handleApplyCoupon = async (code) => {
    // Trigger auto-apply at checkout
    try {
      const saved = JSON.parse(localStorage.getItem("saved_coupons") || "[]");
      if (!saved.includes(code)) {
        saved.push(code);
        localStorage.setItem("saved_coupons", JSON.stringify(saved));
        setSavedCoupons(saved);
      }
    } catch (e) {
      console.error("Failed to save coupon:", e);
    }
    
    // Redirect to checkout
    window.location.href = "/checkout";
  };

  if (loading || eligibleCoupons.length === 0) return null;

  const bestCoupon = eligibleCoupons[0]; // Lấy mã đầu tiên (sắp xếp theo thứ tự)

  return (
    <div className="bg-gradient-to-r from-orange-50 to-white rounded-xl p-4 mb-4 border border-orange-200">
      <div className="flex items-start gap-3">
        <Sparkles className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-orange-900 mb-2">Gợi ý mã phù hợp</h3>
          
          {/* Mã tốt nhất */}
          <div className="bg-white rounded-lg p-3 border border-orange-300 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <code className="font-mono font-bold text-orange-600 text-lg">
                  {bestCoupon.code}
                </code>
                <p className="text-sm text-gray-700 mt-1">
                  {bestCoupon.description || bestCoupon.name}
                </p>
              </div>
              <button
                onClick={() => handleApplyCoupon(bestCoupon.code)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600"
              >
                Dùng ngay
              </button>
            </div>
          </div>

          {/* Các mã khác (nếu có) */}
          {eligibleCoupons.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {eligibleCoupons.slice(1, 4).map((coupon) => (
                <button
                  key={coupon.id}
                  onClick={() => handleApplyCoupon(coupon.code)}
                  className="px-3 py-1 border border-orange-300 rounded-lg text-sm hover:bg-orange-50"
                >
                  <code className="font-mono">{coupon.code}</code>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

