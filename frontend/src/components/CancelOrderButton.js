"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelOrderButton({ orderId, disabled }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onCancel() {
    if (disabled || loading) return;
    if (!confirm(`Bạn có chắc muốn hủy đơn hàng ${orderId}?`)) return;

    setLoading(true);
    try {
      const url = `/api/orders/${encodeURIComponent(orderId)}/cancel`;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Cancel API error:", res.status, url, txt);
        alert("Hủy đơn thất bại (API " + res.status + "). Xem console để biết chi tiết.");
        return;
      }

      const data = await res.json();
      alert(`Đơn ${data.id} đã chuyển sang trạng thái: ${data.newStatus}. ✅`);
      router.replace("/orders");
      router.refresh();
    } catch (e) {
      console.error("Cancel fetch error:", e);
      alert("Không gọi được API hủy đơn. Kiểm tra mạng/route.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onCancel}
      disabled={disabled || loading}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "Đang hủy…" : "Hủy đơn hàng"}
    </button>
  );
}
