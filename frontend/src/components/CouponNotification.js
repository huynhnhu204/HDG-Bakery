"use client";

import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";

export default function CouponNotification() {
  const [show, setShow] = useState(false);
  const [coupon, setCoupon] = useState(null);

  useEffect(() => {
    // Listen for cart changes
    const handleCartUpdate = async () => {
      try {
        const cart = JSON.parse(localStorage.getItem("cart") || "{}");
        const items = Array.isArray(cart.items) ? cart.items : [];
        const subtotal = items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);

        // Get available coupons
        const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
        const res = await fetch(`${API_BASE}/api/v1/coupons/public`);
        if (!res.ok) return;
        const data = await res.json();
        const coupons = data.data || [];

        // Check if we just crossed threshold for any coupon
        for (const couponItem of coupons) {
          if (couponItem.min_order_amount && subtotal >= couponItem.min_order_amount) {
            // Check if we should show notification (not shown before for this coupon)
            const notificationKey = `notified_${couponItem.code}`;
            if (localStorage.getItem(notificationKey)) continue;

            setCoupon(couponItem);
            setShow(true);
            localStorage.setItem(notificationKey, "1");
            // Auto-hide after 10 seconds
            setTimeout(() => setShow(false), 10000);
            break;
          }
        }
      } catch (e) {
        console.error("Failed to check coupon eligibility:", e);
      }
    };

    window.addEventListener("cart-updated", handleCartUpdate);
    window.addEventListener("storage", handleCartUpdate);

    // Check on mount
    handleCartUpdate();

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdate);
      window.removeEventListener("storage", handleCartUpdate);
    };
  }, []);

  const handleUseNow = () => {
    window.location.href = "/cart";
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
  };

  if (!show || !coupon) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-sm animate-slide-up">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl shadow-2xl p-4 border-4 border-white">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">🎉 Bạn đủ điều kiện!</h3>
            <p className="text-sm mb-2">
              Bạn đủ điều kiện dùng mã <code className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
                {coupon.code}
              </code>
            </p>
            <p className="text-xs opacity-90 mb-3">
              {coupon.description || coupon.name}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleUseNow}
                className="flex-1 px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50"
              >
                Dùng ngay
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 hover:bg-white/20 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add this CSS to your global styles if not already present:
// @keyframes slide-up {
//   from { transform: translateY(100px); opacity: 0; }
//   to { transform: translateY(0); opacity: 1; }
// }
// .animate-slide-up {
//   animation: slide-up 0.3s ease-out;
// }

