// src/app/(admin)/admin/menu/[id]/page.js
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

function getToken(){ try { return localStorage.getItem(KEY) || ""; } catch { return ""; } }

async function api(path, { method="GET", body } = {}) {
  const headers = { Accept:"application/json" };
  if (body) headers["Content-Type"] = "application/json";
  const t = getToken(); if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}${API}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j?.message || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

const prettyDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("vi-VN");
};

export default function AdminMenuShowPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [row, setRow] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await api(`/menus/${id}`);
        if (!alive) return;
        setRow(data);
      } catch (e) {
        setErr(e.message || "Không tải được dữ liệu.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  async function onDelete() {
    if (!row?.id) return;
    if (!confirm(`Ẩn mục này và toàn bộ mục con?`)) return;
    try {
      setRemoving(true);
      await api(`/menus/${row.id}`, { method: "DELETE" });
      router.push("/admin/menu?removed=1");
    } catch (e) {
      alert(e.message || "Xoá thất bại");
    } finally {
      setRemoving(false);
    }
  }

  if (loading) return <div className="p-6"><p className="text-gray-500">Đang tải…</p></div>;

  if (err) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-sm text-gray-500 mb-2">
          <Link href="/admin/menu" className="hover:underline">Menu</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-800">Chi tiết</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Chi tiết</h1>
        <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{err}</div>
      </div>
    );
  }

  if (!row) return null;

  const statusBadge = row.status ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs font-medium">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" /> Hiển thị
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 text-gray-700 px-2.5 py-0.5 text-xs font-medium">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-500" /> Ẩn
    </span>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-2">
        <Link href="/admin/menu" className="hover:underline">Menu</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-800">Chi tiết #{row.id}</span>
      </div>

      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Chi tiết menu</h1>
          <p className="text-gray-500 text-sm">Xem thông tin và thao tác nhanh.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/menu/${row.id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black text-white"
          >
            Sửa
          </Link>
          <button
            onClick={onDelete}
            disabled={removing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-red-600"
          >
            {removing ? "Đang xoá…" : "Ẩn (xoá logic)"}
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl border bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 p-6">
          <div>
            <div className="text-xs text-gray-500 mb-1">ID</div>
            <div className="font-medium">{row.id}</div>
          </div>

          <div className="md:col-span-1">
            <div className="text-xs text-gray-500 mb-1">Trạng thái</div>
            <div>{statusBadge}</div>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-gray-500 mb-1">Tên</div>
            <div className="font-medium">{row.name}</div>
          </div>

          {!row.type || row.type !== "group" ? (
            <div className="md:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Liên kết</div>
              <div className="font-mono text-sm break-all">{row.link || <span className="text-gray-400">—</span>}</div>
            </div>
          ) : null}

          <div>
            <div className="text-xs text-gray-500 mb-1">Loại</div>
            <div className="font-medium">{row.type || "custom"}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Vị trí</div>
            <div className="font-medium">{row.position || "mainmenu"}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Menu cha</div>
            <div className="font-medium">{row.parent_id ?? 0}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Thứ tự</div>
            <div className="font-medium">{row.sort_order ?? 0}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Table ID</div>
            <div className="font-medium">{row.table_id ?? <span className="text-gray-400">—</span>}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Ngày nhập (created_at)</div>
            <div className="font-medium">{prettyDate(row.created_at) || <span className="text-gray-400">—</span>}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Người nhập (created_by)</div>
            <div className="font-medium">{row.created_by ?? <span className="text-gray-400">—</span>}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Ngày cập nhật</div>
            <div className="font-medium">{prettyDate(row.updated_at) || <span className="text-gray-400">—</span>}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Người cập nhật</div>
            <div className="font-medium">{row.updated_by ?? <span className="text-gray-400">—</span>}</div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex items-center justify-between">
        <Link href="/admin/menu" className="px-4 h-10 rounded-xl border inline-flex items-center">
          ← Quay lại danh sách
        </Link>
        <Link href={`/admin/menu/${row.id}/edit`} className="px-4 h-10 rounded-xl bg-black text-white inline-flex items-center">
          Sửa
        </Link>
      </div>
    </div>
  );
}
