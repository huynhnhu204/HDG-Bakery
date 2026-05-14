"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/** ===== API base ===== */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

/** ===== helpers ===== */
function getToken() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(KEY); } catch { return null; }
}

async function fetchLookupsFresh() {
  // Thêm ?refresh=1 để bypass cache
  const r = await fetch(`${BASE}${API}/lookups?t=${Date.now()}&refresh=1`, {
    headers: { Accept: "application/json" },
    cache: "no-store", // luôn lấy mới
  });
  if (!r.ok) throw new Error("Load lookups thất bại");
  const data = await r.json();
  // Debug: log để kiểm tra
  console.log('Lookups API Response:', data);
  console.log('tagSuggests:', data?.tagSuggests);
  return data;
}

const Label = ({ children }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>
);

const TextInput = ({ className = "", ...rest }) => (
  <input
    {...rest}
    className={
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 " +
      className
    }
  />
);

const Pill = ({ children, color = "gray" }) => {
  const colors = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
};

export default function LookupPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // tags
  const [tagSuggests, setTagSuggests] = useState([]); // [{id,name,status}]
  const [q, setQ] = useState("");
  const [busyToggleId, setBusyToggleId] = useState(null);

  // channels (read-only)
  const [channels, setChannels] = useState(["pickup", "delivery"]);

  // categories (tham khảo)
  const [categories, setCategories] = useState([]);

  async function loadAll() {
    setErr(null);
    setLoading(true);
    try {
      const d = await fetchLookupsFresh();

      const rawTags = d?.tagSuggests ?? [];
      // API trả về array objects với {id, tag, status} hoặc array strings
      const normalizedTags = rawTags.map((t, idx) => {
        if (typeof t === "string") {
          // Nếu là string, cần fetch lại để lấy id thực (hoặc dùng tạm index)
          // Tạm thời dùng index+1, nhưng nên fetch full data
          return { id: idx + 1, name: t, status: 1 };
        }
        // Nếu là object, dùng id, tag, status thực
        return { 
          id: t.id ?? (idx + 1), 
          name: t.tag ?? t.name ?? String(t), 
          status: t.status ?? 1 
        };
      });
      setTagSuggests(normalizedTags);

      if (Array.isArray(d?.channels)) setChannels(d.channels);

      // categories (public) — cũng no-store
      try {
        const rc = await fetch(`${BASE}${API}/categories?t=${Date.now()}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const dc = rc.ok ? await rc.json() : [];
        const list = Array.isArray(dc?.data) ? dc.data : Array.isArray(dc) ? dc : [];
        setCategories(list);
      } catch {
        setCategories([]);
      }
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const filteredTags = useMemo(() => {
    const t = (q || "").trim().toLowerCase();
    if (!t) return tagSuggests;
    return tagSuggests.filter((x) => x.name.toLowerCase().includes(t));
  }, [q, tagSuggests]);

  async function toggleTag(tag) {
    setBusyToggleId(tag.id);
    setErr(null);
    try {
      const token = getToken();
      const r = await fetch(`${BASE}${API}/lookups/tags/${encodeURIComponent(tag.id)}/toggle`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Toggle tag thất bại");

      // cập nhật local ngay cho mượt
      setTagSuggests((prev) =>
        prev.map((x) => (x.id === tag.id ? { ...x, status: x.status ? 0 : 1 } : x))
      );
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusyToggleId(null);
    }
  }

  return (
    <div className="min-h-screen w-full bg-rose-50 py-10">
      <div className="mx-auto max-w-5xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-rose-100">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Lookups / Bảng cấu hình</h1>
            <p className="text-sm text-gray-500">Quản lý dữ liệu dùng chung (Tag gợi ý, kênh, danh mục tham khảo).</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              {loading ? "Đang tải…" : "Tải lại"}
            </button>
            <Link
              href="/admin/lookups/new"
              className="rounded-md bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600"
            >
              + Thêm
            </Link>
          </div>
        </div>

        {err && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            Lỗi: {err}
          </div>
        )}

        {/* TAG SUGGESTS */}
        <section className="mb-10">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div className="w-64">
              <Label>Tìm nhanh tag</Label>
              <TextInput placeholder="Nhập để lọc…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">ID</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Tên tag</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Trạng thái</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">Đang tải…</td>
                  </tr>
                ) : filteredTags.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">Chưa có tag nào</td>
                  </tr>
                ) : (
                  filteredTags.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2">{t.id}</td>
                      <td className="px-4 py-2">{t.name}</td>
                      <td className="px-4 py-2">
                        {t.status ? <Pill color="green">Đang dùng</Pill> : <Pill>Ẩn</Pill>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => toggleTag(t)}
                          disabled={busyToggleId === t.id}
                          className={`rounded-md px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                            t.status
                              ? "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
                              : "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100"
                          } disabled:opacity-60`}
                        >
                          {busyToggleId === t.id ? "…" : t.status ? "Ẩn (toggle)" : "Bật (toggle)"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* CHANNELS (read-only) */}
        <section className="mb-10">
          <h2 className="mb-2 text-base font-semibold">Kênh giao nhận (read-only)</h2>
          <div className="flex flex-wrap gap-2">
            {channels.map((c) => (
              <Pill key={c} color="blue">{c}</Pill>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Muốn sửa động? Ta có thể thêm API riêng để lưu vào lookups/settings, còn hiện tại giữ đơn giản.
          </p>
        </section>

        {/* CATEGORIES (tham khảo nhanh) */}
        <section>
          <h2 className="mb-2 text-base font-semibold">Danh mục (tham khảo)</h2>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 12).map((c) => (
              <Pill key={c.id}>{c.name}</Pill>
            ))}
            {categories.length > 12 && <Pill color="yellow">+{categories.length - 12} nữa…</Pill>}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            CRUD danh mục làm ở trang Categories riêng.
          </p>
        </section>
      </div>
    </div>
  );
}
