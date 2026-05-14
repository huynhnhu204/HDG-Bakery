"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Edit, Trash2, RotateCcw, ShieldAlert,
  Tag, PackageOpen, Leaf, Milk, Nut, WheatOff, Bike
} from "lucide-react";

/* ====== config ====== */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

/* ====== helpers ====== */
const cx = (...xs) => xs.filter(Boolean).join(" ");
const money = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "₫";
const isDigits = (s) => /^[0-9]+$/.test(String(s || ""));

function normImg(raw) {
  if (!raw) return "/file.svg";
  if (raw.startsWith("http") || raw.startsWith("/")) return raw;
  const cleaned = raw.replace(/^\/+/, "");
  return `${BASE}${API}/storage/${cleaned.replace(/^storage\//, "")}`;
}

async function jfetch(url, { method = "GET", body } = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem(KEY) : "";
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data ?? {};
}

function Chip({ children, className = "" }) {
  return (
    <span className={cx(
      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs border",
      "bg-gray-50 text-gray-700 border-gray-200",
      className
    )}>
      {children}
    </span>
  );
}

/* ====== page ====== */
export default function AdminProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const imageUrl = useMemo(() => {
    if (!item) return "/file.svg";
    return normImg(item.image_url || item.thumbnail || item.image);
  }, [item]);

  const gallery = useMemo(() => {
    const imgs = Array.isArray(item?.images) ? item.images : [];
    return imgs.map((g) => ({ id: g.id, src: normImg(g.image) }));
  }, [item]);

  async function load(currentId) {
    if (!currentId) return; // chờ params sẵn sàng
    setLoading(true);
    setErrorMsg("");
    try {
      // Hỗ trợ cả id số và slug
      const path = isDigits(currentId)
        ? `${BASE}${API}/products/${encodeURIComponent(currentId)}`
        : `${BASE}${API}/products/slug/${encodeURIComponent(currentId)}`;

      const data = await jfetch(path);

      // Chuẩn hoá image_url + meta
      data.image_url = normImg(data.image_url || data.thumbnail || data.image);
      const meta = data?.meta || {};

      data.__sku            = data.sku ?? meta.sku ?? "";
      data.__tags           = Array.isArray(data.tags) ? data.tags : (Array.isArray(meta.tags) ? meta.tags : []);
      data.__flavors        = Array.isArray(data.flavors) ? data.flavors : (Array.isArray(meta.flavors) ? meta.flavors : []);
      data.__ingredients    = Array.isArray(data.ingredients) ? data.ingredients : (Array.isArray(meta.ingredients) ? meta.ingredients : []);
      data.__channels       = Array.isArray(data.channels) ? data.channels : (Array.isArray(meta.channels) ? meta.channels : []);
      data.__nutrition      = data.nutrition || meta.nutrition || {};
      data.__weightGram     = data.weight_gram ?? meta.weightGram ?? null;
      data.__bestBeforeDays = data.best_before_days ?? meta.bestBeforeDays ?? null;
      data.__availableFrom  = data.available_from ?? meta.availableFrom ?? null;
      data.__contentHTML    = data.content_html ?? data.content ?? "";

      setItem(data);
    } catch (e) {
      setItem(null);
      setErrorMsg(e.message || "Không tải được sản phẩm");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;     // 🔒 tránh gọi khi id chưa có
    load(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Actions
  async function toTrash() {
    if (!item) return;
    if (!confirm("Đưa sản phẩm này vào thùng rác?")) return;
    try {
      const path = `${BASE}${API}/products/${item.id}`;
      await jfetch(path, { method: "DELETE" });
      alert("Đã đưa vào thùng rác.");
      router.push("/admin/products");
    } catch (e) {
      alert("Thao tác thất bại: " + e.message);
    }
  }

  async function restore() {
    if (!item) return;
    try {
      const path = `${BASE}${API}/products/${item.id}/restore`;
      await jfetch(path, { method: "POST" });
      alert("Đã khôi phục.");
      load(id);
    } catch (e) {
      alert("Khôi phục thất bại: " + e.message);
    }
  }

  async function purge() {
    if (!item) return;
    if (!confirm("Xoá vĩnh viễn? Hành động này không thể hoàn tác.")) return;
    try {
      const path = `${BASE}${API}/products/${item.id}/purge`;
      await jfetch(path, { method: "DELETE" });
      alert("Đã xoá vĩnh viễn.");
      router.push("/admin/products");
    } catch (e) {
      alert("Xoá vĩnh viễn thất bại: " + e.message);
    }
  }

  if (!id) {
    // Khi Next chưa có params (hydration), show skeleton nhẹ
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-60" />
          <div className="h-64 bg-gray-100 rounded" />
          <div className="h-24 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-60" />
          <div className="h-64 bg-gray-100 rounded" />
          <div className="h-24 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-red-600 text-sm">Lỗi: {errorMsg}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(id)}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50"
          >
            Thử lại
          </button>
          <Link href="/admin/products" className="px-3 py-2 rounded-lg border hover:bg-gray-50">
            ← Về danh sách
          </Link>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const buy  = Number(item.price_buy || 0);
  const sale = item.price_sale && item.price_sale < buy ? Number(item.price_sale) : null;
  const pct  = sale && buy > 0 ? Math.max(0, Math.round(100 - (sale / buy) * 100)) : 0;
  const variants = Array.isArray(item.variants) ? item.variants : [];

  const variantRows = variants.map((variant, idx) => {
    const weight = variant.weight_gram ?? variant.weightGram ?? null;
    const label = weight ? `${weight} g` : (variant.name || `#${idx + 1}`);
    const base = Number(variant.price || 0);
    const promo = variant.price_sale && Number(variant.price_sale) < base ? Number(variant.price_sale) : null;
    return {
      id: variant.id ?? idx,
      label,
      base,
      promo,
      stock: variant.stock ?? null,
      status: variant.status,
      isDefault: Boolean(variant.is_default),
    };
  });

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb / Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link href="/admin/products" className="inline-flex items-center gap-2 hover:underline">
            <ArrowLeft size={16} /> Danh sách sản phẩm
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">#{item.id}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/products/${item.id}/edit`}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 inline-flex items-center gap-2"
            title="Sửa"
          >
            <Edit size={16} /> Sửa
          </Link>

          {Number(item.status) === 1 ? (
            <button
              onClick={toTrash}
              className="px-3 py-2 rounded-lg border text-rose-600 hover:bg-rose-50 inline-flex items-center gap-2"
              title="Đưa vào thùng rác"
            >
              <Trash2 size={16} /> Thùng rác
            </button>
          ) : (
            <>
              <button
                onClick={restore}
                className="px-3 py-2 rounded-lg border text-emerald-600 hover:bg-emerald-50 inline-flex items-center gap-2"
                title="Khôi phục"
              >
                <RotateCcw size={16} /> Khôi phục
              </button>
              <button
                onClick={purge}
                className="px-3 py-2 rounded-lg border text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
                title="Xoá vĩnh viễn"
              >
                <ShieldAlert size={16} /> Xoá vĩnh viễn
              </button>
            </>
          )}
        </div>
      </div>

      {/* Title + Status */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{item.name}</h1>
          <div className="text-xs text-gray-500 font-mono mt-1">{item.slug}</div>
          {item.__sku && (
            <div className="mt-1">
              <Chip className="bg-blue-50 text-blue-700 border-blue-200">
                <Tag size={14} /> SKU: {item.__sku}
              </Chip>
            </div>
          )}
        </div>
        <span
          className={cx(
            "px-2 py-1 rounded text-xs font-medium h-6 inline-flex items-center",
            Number(item.status) === 1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          )}
          title="Trạng thái hiển thị"
        >
          {Number(item.status) === 1 ? "Hiển thị" : "Ẩn"}
        </span>
      </div>

      {/* Top grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: image + gallery */}
        <div className="md:col-span-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={item.name}
            className="w-full aspect-[4/3] object-cover rounded-2xl border bg-white"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallback === "1") return;
              img.dataset.fallback = "1";
              img.src = "/file.svg";
            }}
          />
          {/* Gallery */}
          {gallery.length > 0 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {gallery.map((g) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={g.id}
                  src={g.src}
                  alt=""
                  className="w-full h-16 object-cover rounded-lg border bg-white"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallback === "1") return;
                    img.dataset.fallback = "1";
                    img.src = "/file.svg";
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: pricing + category + channels */}
        <div className="md:col-span-2 space-y-4">
          {/* Prices */}
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <div className="text-xs text-gray-500">Giá niêm yết</div>
                <div className={cx("text-lg font-semibold", sale ? "line-through text-gray-400" : "")}>
                  {money(buy)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Giá khuyến mãi</div>
                <div className={cx("text-lg font-semibold", sale ? "text-rose-600" : "text-gray-700")}>
                  {sale ? money(sale) : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">% giảm</div>
                <div className="text-lg font-semibold">{sale ? `-${pct}%` : "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Danh mục</div>
                <div className="text-sm">
                  {item.category?.name ? (
                    <span className="px-2 py-0.5 rounded bg-gray-100">{item.category.name}</span>
                  ) : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Channels / Nutrition quick badges */}
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Chip><PackageOpen size={14}/> Tồn kho tổng: {item.quantity ?? "—"}</Chip>
              {Array.isArray(item.__channels) && item.__channels.length > 0 && (
                <Chip className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <Bike size={14} /> {item.__channels.join(" • ")}
                </Chip>
              )}
              {item.__nutrition?.vegan ? <Chip className="bg-green-50 text-green-700 border-green-200"><Leaf size={14}/> Vegan</Chip> : null}
              {item.__nutrition?.glutenFree ? <Chip className="bg-indigo-50 text-indigo-700 border-indigo-200"><WheatOff size={14}/> Không gluten</Chip> : null}
              {item.__nutrition?.containsNuts ? <Chip className="bg-amber-50 text-amber-700 border-amber-200"><Nut size={14}/> Có hạt</Chip> : null}
              {item.__nutrition?.containsDairy ? <Chip className="bg-sky-50 text-sky-700 border-sky-200"><Milk size={14}/> Có sữa</Chip> : null}
            </div>
          </div>
        </div>
      </div>

      {/* Variants pricing */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Bảng giá theo size / khối lượng</div>
            <div className="text-xs text-gray-500">Mỗi dòng tương ứng một khối lượng cụ thể.</div>
          </div>
          <Link
            href={`/admin/products/${item.id}/edit#variants`}
            className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded border hover:bg-gray-50"
          >
            <Edit size={14}/> Chỉnh sửa
          </Link>
        </div>
        {variantRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Khối lượng</th>
                  <th className="px-3 py-2 text-left">Giá</th>
                  <th className="px-3 py-2 text-left">Giá khuyến mãi</th>
                  <th className="px-3 py-2 text-left">Tồn kho</th>
                  <th className="px-3 py-2 text-left">Hiển thị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variantRows.map((row) => (
                  <tr key={row.id} className="align-middle">
                    <td className="px-3 py-2 font-medium text-gray-900">{row.label}</td>
                    <td className="px-3 py-2">{money(row.base)}</td>
                    <td className="px-3 py-2">{row.promo ? money(row.promo) : "—"}</td>
                    <td className="px-3 py-2">{row.stock ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {row.status ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-green-700 border border-green-200">
                          {row.isDefault ? "Mặc định" : "Hiển thị"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 border border-gray-200">
                          Ẩn
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Chưa cấu hình bảng giá theo khối lượng.</div>
        )}
      </div>

      {/* Descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-medium mb-1">Mô tả ngắn</div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {item.description || "—"}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-medium mb-1">Nội dung</div>
          {item.__contentHTML ? (
            <div
              className="prose prose-sm max-w-none prose-img:rounded-lg prose-headings:scroll-mt-20"
              dangerouslySetInnerHTML={{ __html: item.__contentHTML }}
            />
          ) : (
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {item.content || "—"}
            </div>
          )}
        </div>
      </div>

      {/* Meta blocks: flavors / ingredients / tags */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-medium mb-2">Hương vị</div>
          {Array.isArray(item.__flavors) && item.__flavors.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {item.__flavors.map((f) => <Chip key={f}>{f}</Chip>)}
            </div>
          ) : <div className="text-sm text-gray-500">—</div>}
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-medium mb-2">Thành phần</div>
          {Array.isArray(item.__ingredients) && item.__ingredients.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {item.__ingredients.map((ing) => <Chip key={ing}>{ing}</Chip>)}
            </div>
          ) : <div className="text-sm text-gray-500">—</div>}
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-medium mb-2">Thẻ (tags)</div>
          {Array.isArray(item.__tags) && item.__tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {item.__tags.map((t) => <Chip key={t}><Tag size={14} /> {t}</Chip>)}
            </div>
          ) : <div className="text-sm text-gray-500">—</div>}
        </div>
      </div>

      {/* Other info */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-medium mb-2">Thông tin khác</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-gray-500">Loại:</span> {item.type || "—"}</div>
          <div>
            <span className="text-gray-500">HSD (ngày):</span>{" "}
            {item.__bestBeforeDays ?? "—"}
          </div>
          <div>
            <span className="text-gray-500">Bán từ:</span>{" "}
            {item.__availableFrom ? new Date(item.__availableFrom).toLocaleDateString("vi-VN") : "—"}
          </div>
          <div>
            <span className="text-gray-500">Tạo lúc:</span>{" "}
            {item.created_at ? new Date(item.created_at).toLocaleString("vi-VN") : "—"}
          </div>
          <div>
            <span className="text-gray-500">Cập nhật:</span>{" "}
            {item.updated_at ? new Date(item.updated_at).toLocaleString("vi-VN") : "—"}
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between pt-2">
        <Link href="/admin/products" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
          <ArrowLeft size={16} /> Quay về danh sách
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/products/${item.id}/edit`}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <Edit size={16} /> Sửa
          </Link>

          {Number(item.status) === 1 ? (
            <button
              onClick={toTrash}
              className="px-3 py-2 rounded-lg border text-rose-600 hover:bg-rose-50 inline-flex items-center gap-2"
            >
              <Trash2 size={16} /> Thùng rác
            </button>
          ) : (
            <>
              <button
                onClick={restore}
                className="px-3 py-2 rounded-lg border text-emerald-600 hover:bg-emerald-50 inline-flex items-center gap-2"
              >
                <RotateCcw size={16} /> Khôi phục
              </button>
              <button
                onClick={purge}
                className="px-3 py-2 rounded-lg border text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
              >
                <ShieldAlert size={16} /> Xoá vĩnh viễn
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
