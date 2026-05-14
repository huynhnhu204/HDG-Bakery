"use client";

import React, { useEffect, useState } from "react";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";

const Pill = ({ children, color = "gray" }) => {
  const colors = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    yellow: "bg-yellow-100 text-yellow-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
};

export default function ProductDetailPage({ params }) {
  const id = params?.id;

  const [item, setItem] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`${BASE}${API}/products/${encodeURIComponent(id)}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d?.message || "Load thất bại");
        if (aborted) return;
        setItem(d);
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-rose-50 py-10">
        <div className="mx-auto max-w-5xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-rose-100">
          <div className="text-sm text-gray-600">Đang tải…</div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen w-full bg-rose-50 py-10">
        <div className="mx-auto max-w-5xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-rose-100">
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">Lỗi: {err}</div>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const priceBuy = item.price_buy ?? 0;
  const priceSale = item.price_sale ?? priceBuy;
  const hasSale = priceSale > 0 && priceSale < priceBuy;

  return (
    <div className="min-h-screen w-full bg-rose-50 py-10">
      <div className="mx-auto max-w-5xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-rose-100">
        {/* Header */}
        <div className="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{item.name}</h1>
            <p className="text-xs text-gray-500">Slug: {item.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            {item.status ? <Pill color="green">Published</Pill> : <Pill>Draft</Pill>}
            {item.category?.name && <Pill color="blue">{item.category.name}</Pill>}
            {item.sku && <Pill color="yellow">SKU: {item.sku}</Pill>}
          </div>
        </div>

        {/* Top section */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* images */}
          <div className="md:col-span-1">
            <div className="aspect-square overflow-hidden rounded-lg ring-1 ring-gray-200">
              <img
                src={item.thumbnail || item.image || "https://via.placeholder.com/400x400?text=No+Image"}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            {Array.isArray(item.images) && item.images.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {item.images.slice(0, 6).map((img, i) => (
                  <img key={i} src={img.image} alt="" className="h-16 w-16 rounded-md object-cover ring-1 ring-gray-200" />
                ))}
              </div>
            )}
          </div>

          {/* info */}
          <div className="md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-500">Giá</div>
                <div className="mt-1">
                  {hasSale ? (
                    <div className="flex items-baseline gap-3">
                      <span className="text-xl font-semibold text-rose-600">
                        {priceSale.toLocaleString()}₫
                      </span>
                      <span className="text-sm text-gray-400 line-through">
                        {priceBuy.toLocaleString()}₫
                      </span>
                    </div>
                  ) : (
                    <div className="text-xl font-semibold">{priceBuy.toLocaleString()}₫</div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Tồn kho</div>
                <div className="mt-1 text-lg">{(item.total_qty ?? item.quantity ?? 0).toLocaleString()}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Kênh nhận hàng</div>
                <div className="mt-1 flex gap-2">
                  {(item.channels || []).map((c) => (
                    <Pill key={c} color="rose">{c}</Pill>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Thuộc tính</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {item.nutrition?.vegan && <Pill>Vegan</Pill>}
                  {item.nutrition?.glutenFree && <Pill>Không gluten</Pill>}
                  {(item.nutrition?.containsNuts || item.nutrition?.nuts) && <Pill>Có hạt</Pill>}
                  {(item.nutrition?.containsDairy || item.nutrition?.dairy) && <Pill> Có sữa</Pill>}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Khối lượng</div>
                <div className="mt-1">{item.weight_gram ?? item.meta?.weightGram ?? "-"} g</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">HSD / dùng ngon</div>
                <div className="mt-1">{item.best_before_days ?? item.meta?.bestBeforeDays ?? "-"} ngày</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Bán từ ngày</div>
                <div className="mt-1">{item.available_from ?? item.meta?.availableFrom ?? "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Tags</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(item.tags || item.meta?.tags || []).map((t) => <Pill key={t}>{t}</Pill>)}
                </div>
              </div>
            </div>

            {/* description */}
            {item.description && (
              <div className="mt-6">
                <div className="text-sm font-medium">Mô tả ngắn</div>
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{item.description}</p>
              </div>
            )}

            {/* content html */}
            {item.content_html && (
              <div className="mt-6">
                <div className="text-sm font-medium">Gợi ý / Ghi chú</div>
                <div
                  className="prose prose-sm mt-1 max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.content_html }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
