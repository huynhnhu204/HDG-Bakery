// src/app/(site)/cart/[id]/OrderDetailClient.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const TOKEN_KEY = "auth_token";
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";

function StatusBadge({ status }) {
  const map = {
    0: ["Vô hiệu", "bg-gray-100 text-gray-700"],
    1: ["Mới tạo", "bg-blue-100 text-blue-700"],
    2: ["Đang xử lý", "bg-amber-100 text-amber-700"],
    3: ["Hoàn tất", "bg-emerald-100 text-emerald-700"],
    4: ["Đã huỷ", "bg-rose-100 text-rose-700"],
  };
  const [text, cls] = map[Number(status)] || [`Trạng thái ${status}`, "bg-gray-100 text-gray-700"];
  return (
    <span
      aria-label={`Trạng thái đơn hàng: ${text}`}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      {text}
    </span>
  );
}

export default function OrderDetailClient({ id, apiBase }) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [details, setDetails] = useState([]);
  const [err, setErr] = useState("");
  const [pMap, setPMap] = useState({}); // { [product_id]: productJson }

  const absUrl = (urlOrPath) => {
    if (!urlOrPath) return "";
    return /^https?:\/\//i.test(urlOrPath) ? urlOrPath : `${apiBase}${urlOrPath}`;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
        if (!token) {
          setErr("Bạn cần đăng nhập để xem chi tiết đơn hàng.");
          setLoading(false);
          return;
        }

        const fetchJson = async (url) => {
          const res = await fetch(url, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.warn("[OrderDetail] Fetch fail", { url, status: res.status, body: text });
            const err = new Error(String(res.status));
            err.status = res.status;
            err.body = text;
            err.url = url;
            throw err;
          }
          return res.json();
        };

        // 1) Ưu tiên endpoint "my"
        const urlMy = `${apiBase}/api/v1/orders/my/${id}`;
        let data;
        try {
          data = await fetchJson(urlMy);
        } catch (e) {
          if (Number(e?.status) === 404) {
            const urlPub = `${apiBase}/api/v1/orders/${id}?include=details`;
            data = await fetchJson(urlPub); // thử public (có Bearer)
          } else if (Number(e?.status) === 401) {
            throw new Error("Phiên đăng nhập hết hạn (401). Vui lòng đăng nhập lại.");
          } else {
            throw new Error(`API lỗi (HTTP ${e?.status || "?"}).`);
          }
        }

        if (!alive) return;
        setOrder(data || null);
        const det = Array.isArray(data?.details) ? data.details : [];
        setDetails(det);

        // 2) Nếu thiếu ảnh, fetch thêm chi tiết sản phẩm
        const ids = [...new Set(det.map(d => Number(d.product_id)).filter(Boolean))];
        if (ids.length) {
          const pairs = await Promise.all(ids.map(async (pid) => {
            try {
              const p = await fetchJson(`${apiBase}/api/v1/products/${pid}`);
              return [pid, p];
            } catch {
              return [pid, null];
            }
          }));
          if (!alive) return;
          setPMap(Object.fromEntries(pairs));
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Không thể tải chi tiết đơn hàng.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, apiBase]);

  const summary = useMemo(() => {
    const sub = details.reduce((s, d) => s + (Number(d.price) || 0) * (Number(d.qty) || 0), 0);
    // Lấy discount từ order (discount từ coupon), không phải từ details
    const discount = Number(order?.discount_amount || 0);
    const shipping = Number(order?.shipping_fee || 0);
    const total = Number(order?.total ?? (sub - discount + shipping));
    return { sub, discount, shipping, total, couponCode: order?.coupon_code };
  }, [details, order]);

  const resolveThumb = (d) => {
    const fromDetail =
      d.thumb ||
      d.image ||
      d.thumbnail ||
      d.product?.thumbnail ||
      d.product?.image;
    if (fromDetail) return absUrl(fromDetail);
    const pid = Number(d.product_id);
    const p = pid ? pMap[pid] : null;
    const fromProduct = p?.thumbnail || p?.image;
    return fromProduct ? absUrl(fromProduct) : "https://picsum.photos/seed/dola/80/80";
  };

  if (loading) {
    return (
      <section aria-busy="true" className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="text-gray-600">Đang tải…</p>
      </section>
    );
  }

  if (err) {
    return (
      <section role="alert" className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="text-red-600">{err}</p>
        <div className="mt-3 flex gap-2">
          <Link href="/profile" className="btn-ghost">← Về hồ sơ</Link>
          <Link href="/cart" className="btn-ghost">← Về giỏ hàng</Link>
        </div>
        <style jsx>{`
          .btn-ghost{display:inline-flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;border-radius:.5rem;padding:.625rem 1rem;font-weight:500}
          .btn-ghost:hover{background:#f9fafb}
        `}</style>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="text-gray-600">Không có dữ liệu đơn hàng.</p>
      </section>
    );
  }

  return (
    <>
      <section aria-labelledby="order-header" className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="order-header" className="text-2xl font-extrabold text-orange-600">
            Đơn hàng #{order.id}
          </h2>
          <p className="text-sm text-gray-600">
            Ngày tạo: {order.created_at?.replace("T"," ").slice(0,19) || "—"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
        </div>
      </section>

      {/* Thông tin KH */}
      <section aria-labelledby="shipto" className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 id="shipto" className="mb-2 text-sm font-semibold text-gray-700">Người nhận</h3>
          <div className="text-sm">
            <div className="font-medium">{order.name}</div>
            <div className="text-gray-600">{order.phone}</div>
            <div className="text-gray-600">{order.email}</div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Địa chỉ</h3>
          <p className="text-sm text-gray-700">{order.address}</p>
          {order.note && <p className="mt-1 text-sm text-gray-500">Ghi chú: {order.note}</p>}
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Tổng quan</h3>
          <div className="text-sm flex items-center justify-between"><span>Tạm tính</span><span>{vnd(summary.sub)}</span></div>
          {summary.discount > 0 && (
            <div className="text-sm flex items-center justify-between">
              <span>
                Giảm {summary.couponCode && <span className="text-orange-600">({summary.couponCode})</span>}
              </span>
              <span>-{vnd(summary.discount)}</span>
            </div>
          )}
          <div className="text-sm flex items-center justify-between"><span>Vận chuyển</span><span>{vnd(summary.shipping)}</span></div>
          <div className="my-2 border-t" />
          <div className="text-base font-extrabold flex items-center justify-between">
            <span>Tổng cộng</span><span>{vnd(summary.total)}</span>
          </div>
        </div>
      </section>

      {/* Chi tiết sản phẩm (có ảnh) */}
      <section aria-labelledby="order-lines" className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 id="order-lines" className="mb-3 text-lg font-bold">Chi tiết sản phẩm</h3>
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th scope="col" className="px-3 py-3 font-semibold">Sản phẩm</th>
                <th scope="col" className="px-3 py-3 font-semibold">Đơn giá</th>
                <th scope="col" className="px-3 py-3 font-semibold">SL</th>
                <th scope="col" className="px-3 py-3 font-semibold">Giảm</th>
                <th scope="col" className="px-3 py-3 font-semibold">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {(details || []).map((it, idx) => {
                const price = Number(it.price) || 0;
                const qty = Number(it.qty) || 0;
                // Thành tiền = đơn giá * số lượng (không trừ discount vì discount là ở cấp order)
                const amount = price * qty;
                const name = it.name || it.product_name || it.product?.name || `Sản phẩm #${it.product_id || idx+1}`;
                const img = resolveThumb(it);
                return (
                  <tr key={idx} className="border-t align-top">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt={name}
                          width={56}
                          height={56}
                          loading="lazy"
                          className="h-14 w-14 rounded-lg object-cover border"
                        />
                        <div>
                          <div className="font-medium">{name}</div>
                          {(it.variant_name || it.variant) && (
                            <div className="text-xs text-gray-500">
                              {it.variant_name || it.variant}
                              {it.variant_weight ? ` · ${it.variant_weight}g` : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">{vnd(price)}</td>
                    <td className="px-3 py-3">{qty}</td>
                    <td className="px-3 py-3">—</td>
                    <td className="px-3 py-3 font-semibold">{vnd(amount)}</td>
                  </tr>
                );
              })}
              {!details?.length && (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">Không có sản phẩm.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex gap-2">
          <Link href="/profile" className="btn-ghost">← Về hồ sơ</Link>
          <Link href="/cart" className="btn-ghost">← Về giỏ hàng</Link>
        </div>
      </section>

      <style jsx>{`
        .btn-ghost{display:inline-flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;border-radius:.5rem;padding:.625rem 1rem;font-weight:500}
        .btn-ghost:hover{background:#f9fafb}
      `}</style>
    </>
  );
}
