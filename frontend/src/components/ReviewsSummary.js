"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

export default function ReviewsSummary({ productId }) {
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/products/${productId}/reviews?per_page=1`, { cache: "no-store" });
        const data = await res.json();
        if (!aborted) {
          setSummary(data.summary || null);
          setTotal(data.summary?.total || 0);
        }
      } catch {}
    })();
    return () => { aborted = true; };
  }, [productId]);

  const avg = summary?.average || 0;
  const dist = summary?.distribution || { 5:0,4:0,3:0,2:0,1:0 };

  if (total === 0) {
    return (
      <div className="rounded-xl border bg-white p-4 mt-8">
        <div className="text-center py-8">
          <div className="text-6xl mb-2">⭐</div>
          <p className="text-gray-600 mb-4">Hãy là người đầu tiên chia sẻ cảm nhận về món này!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4 mt-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl font-bold text-amber-700">{avg.toFixed(1)}</span>
            <div className="flex items-center">
              <span className="text-2xl">⭐</span>
              <span className="text-gray-500 text-lg">/5</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">{total} đánh giá</div>
        </div>
        <div className="flex flex-col gap-1 min-w-[220px]">
          {[5,4,3,2,1].map(s => {
            const count = dist[s] || 0;
            const pct = total > 0 ? Math.round((count/total)*100) : 0;
            return (
              <div key={s} className="flex items-center gap-2 text-sm">
                <span className="w-8 text-right">{s}★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded">
                  <div className="h-2 bg-amber-500 rounded" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-10 text-right text-gray-600">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


