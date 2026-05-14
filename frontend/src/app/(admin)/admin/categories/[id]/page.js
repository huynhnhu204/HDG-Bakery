"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, ArrowLeft, RefreshCcw, Tag } from "lucide-react";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = BASE + "/api/v1/categories";

async function fetchJSON(url, opt = {}) {
  const r = await fetch(url, {
    cache: "no-store",
    ...opt,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(opt.headers || {}),
    },
  });
  const txt = await r.text().catch(() => "");
  const d = txt ? safeJson(txt) : {};
  if (!r.ok) throw new Error(d?.message || d?.error || `${r.status} ${r.statusText}`);
  return d;
}
function safeJson(t){ try { return JSON.parse(t); } catch { return {}; } }

function Badge({ ok, children }) {
  const cls = ok
    ? "bg-green-100 text-green-700 border-green-200"
    : "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {children}
    </span>
  );
}

function SkeletonLine({ className = "" }) {
  return <div className={`h-4 bg-gray-200/70 rounded animate-pulse ${className}`} />;
}

export default function CategoryDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const [row, setRow] = useState(null);
  const [parentName, setParentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");

  const statusOk = useMemo(() => String(row?.status ?? "") === "1", [row]);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await fetchJSON(`${API}/${id}`);
      setRow(data);
      if (data?.parent_id && Number(data.parent_id) > 0) {
        fetchJSON(`${API}/${data.parent_id}`).then((p) => setParentName(p?.name || "")).catch(()=>{});
      } else {
        setParentName("");
      }
    } catch (e) {
      setErr(e.message || "Không tải được danh mục");
      setRow(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  const handleDelete = async () => {
    if (!row) return;
    if (!confirm(`Xoá (ẩn) danh mục "${row.name}"?`)) return;
    try {
      setDeleting(true);
      await fetchJSON(`${API}/${id}`, { method: "DELETE" });
      alert("Đã xoá (đặt status=0).");
      router.push("/admin/categories");
    } catch (e) {
      alert(e.message || "Xoá thất bại");
    } finally {
      setDeleting(false);
    }
  };

  /* ---------------- Render ---------------- */

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonLine className="w-56 h-6" />
            <div className="flex items-center gap-3">
              <SkeletonLine className="w-24" />
              <SkeletonLine className="w-40" />
            </div>
          </div>
          <div className="flex gap-2">
            <SkeletonLine className="w-24 h-10" />
            <SkeletonLine className="w-24 h-10" />
            <SkeletonLine className="w-28 h-10" />
            <SkeletonLine className="w-24 h-10" />
          </div>
        </div>

        {/* Card skeleton */}
        <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonLine className="w-32" />
            <SkeletonLine className="w-28" />
            <SkeletonLine className="w-40" />
            <SkeletonLine className="w-20" />
            <SkeletonLine className="w-full h-24 md:col-span-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <SkeletonLine className="w-48" />
            <SkeletonLine className="w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-rose-600">{err}</div>
        <button
          onClick={() => router.push("/admin/categories")}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border hover:bg-gray-50"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-gray-600">Không tìm thấy.</div>
        <button
          onClick={() => router.push("/admin/categories")}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border hover:bg-gray-50"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500">
        <button
          onClick={() => router.push("/admin/categories")}
          className="inline-flex items-center gap-1 hover:underline"
        >
          <Tag size={14} className="text-gray-400" />
          Danh mục
        </button>
        <span className="mx-1">/</span>
        <span className="text-gray-800">#{id}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{row.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <Badge ok={statusOk}>{statusOk ? "Hiển thị" : "Ẩn"}</Badge>
            {row.slug && (
              <span className="text-xs text-gray-500">
                Đường dẫn: <span className="font-mono">/category/{row.slug}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={load}
            className="h-10 px-3 rounded-xl border bg-white hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
          <Link href={`/admin/categories/${id}/edit`}>
            <button className="h-10 px-3 rounded-xl bg-black text-white hover:opacity-95 inline-flex items-center gap-2">
              <Pencil size={16} /> Sửa
            </button>
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="h-10 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 inline-flex items-center gap-2 disabled:opacity-60"
          >
            <Trash2 size={16} /> {deleting ? "Đang xoá…" : "Xoá"}
          </button>
          <button
            onClick={() => router.push("/admin/categories")}
            className="h-10 px-3 rounded-xl border hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
        </div>
      </div>

      {/* Card chi tiết */}
      <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Tên" value={row.name || "—"} />
          <Field label="Slug" value={row.slug || "—"} mono />
          <Field label="Danh mục cha" value={parentName || (row.parent_id ? `#${row.parent_id}` : "—")} />
          <Field label="Thứ tự" value={row.sort_order ?? 0} />
          <div className="md:col-span-2">
            <div className="text-xs text-gray-500 mb-1">Mô tả</div>
            <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-line min-h-[44px]">
              {row.description || "—"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          <Field label="Tạo lúc" value={row.created_at ? new Date(row.created_at).toLocaleString("vi-VN") : "—"} />
          <Field label="Cập nhật" value={row.updated_at ? new Date(row.updated_at).toLocaleString("vi-VN") : "—"} />
        </div>
      </div>

      {/* Link FE */}
      {row.slug && (
        <div className="text-sm">
          <a href={`/product?category=${row.slug}`} className="text-amber-700 hover:underline" target="_blank">
            Xem sản phẩm thuộc danh mục này ở trang bán hàng →
          </a>
        </div>
      )}

      {/* Small styles */}
      <style jsx>{`
        .animate-pulse { animation: pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity: .6 } 50% { opacity: 1 } }
      `}</style>
    </div>
  );
}

/* -------- Small UI -------- */
function Field({ label, value, mono }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={mono ? "font-mono text-gray-900" : "text-gray-900"}>{value}</div>
    </div>
  );
}
