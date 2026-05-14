"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

const cx = (...xs) => xs.filter(Boolean).join(" ");
const fmtDT = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN");
};

function getToken(){ try { return localStorage.getItem(KEY) || ""; } catch { return ""; } }

async function api(path, { method="GET", body } = {}) {
  const headers = { Accept:"application/json" };
  if (body) headers["Content-Type"] = "application/json";
  const t = getToken(); if (t) headers.Authorization = `Bearer ${t}`;

  let res, text, data;
  try {
    res  = await fetch(`${BASE}${API}${path}`, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    text = await res.text();
  } catch (e) {
    const err = new Error("Không kết nối được tới máy chủ (Network/CORS).");
    err.kind = "network"; err.cause = e;
    throw err;
  }

  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `HTTP ${res.status}`);
    err.status  = res.status;
    err.url     = res.url;
    err.details = data?.errors || data || text || null;
    err.kind    = "http";
    throw err;
  }
  return data;
}

function ErrorPanel({ error }) {
  if (!error) return null;
  const meta = [];
  if (error.status) meta.push(`Status: ${error.status}`);
  if (error.url)    meta.push(`URL: ${error.url}`);
  const details = error?.details?.errors || error?.details;

  return (
    <div className="mb-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm space-y-1">
      <div className="font-medium">{error.message}</div>
      {meta.length > 0 && <div className="text-xs opacity-70">{meta.join(" · ")}</div>}
      {details && typeof details === "object" && (
        <ul className="list-disc pl-5">
          {Object.entries(details).map(([k,v])=>(
            <li key={k}><span className="font-medium">{k}</span>: {Array.isArray(v)? v.join(", "): String(v)}</li>
          ))}
        </ul>
      )}
      {typeof details === "string" && <pre className="text-xs whitespace-pre-wrap">{details}</pre>}
    </div>
  );
}

const Icon = {
  Eye: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/></svg>),
  Edit: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>),
  Trash: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>),
  Plus: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z"/></svg>),
  Refresh: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.95 7.95 0 0012 4V1L7 6l5 5V7c2.76 0 5 2.24 5 5a5 5 0 01-8.9 3H6.26A7 7 0 1012 2a7 7 0 015.65 4.35z"/></svg>),
};

async function apiGetMenus(params = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.position) qs.set("position", params.position);
  if (params.type) qs.set("type", params.type);
  if (params.status !== "" && params.status !== undefined && params.status !== null) {
    qs.set("status", String(params.status));
  }
  qs.set("per_page", String(params.per_page ?? 50));
  qs.set("page", String(params.page ?? 1));
  return api(`/menus?${qs.toString()}`);
}
async function apiDeleteMenu(id) { return api(`/menus/${id}`, { method:"DELETE" }); }

export default function AdminMenuListPage() {
  const [q, setQ] = useState("");
  const [position, setPosition] = useState("mainmenu");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("1");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pg, setPg] = useState(null);
  const [err, setErr] = useState(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiGetMenus({ q, position, type, status, per_page: 100, page });
      setRows(data?.data || []);
      setPg(data);
    } catch (e) {
      setErr(e);
      setRows([]);
      setPg(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [position, type, status, page]);

  async function removeRow(r) {
    if (!confirm(`Ẩn mục "${r.name}"? (Ẩn luôn các mục con) `)) return;
    try {
      await apiDeleteMenu(r.id);
      await load();
    } catch (e) {
      setErr(e);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Menu</h1>
          <p className="text-gray-500 text-sm">Quản lý menu hiển thị ở site.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/menu/trash" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border">
            <Icon.Trash /> Thùng rác
          </Link>
          <Link href="/admin/menu/new" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black text-white">
            <Icon.Plus /> Thêm menu
          </Link>
          <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border">
            <Icon.Refresh /> Làm mới
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
        <div className="md:col-span-2 flex gap-2">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Tìm theo tên…"
            className="border rounded-xl px-3 py-2 w-full"
          />
          <button onClick={() => { setPage(1); load(); }} className="px-3 py-2 rounded-xl bg-black text-white">Tìm</button>
        </div>
        <select value={position} onChange={(e)=>{ setPosition(e.target.value); setPage(1); }} className="border rounded-xl px-3 py-2">
          <option value="mainmenu">Main menu</option>
          <option value="footermenu">Footer menu</option>
        </select>
        <select value={type} onChange={(e)=>{ setType(e.target.value); setPage(1); }} className="border rounded-xl px-3 py-2">
          <option value="">(Tất cả loại)</option>
          <option value="custom">Tự nhập</option>
          <option value="category">Danh mục</option>
          <option value="page">Trang</option>
          <option value="topic">Chủ đề</option>
          <option value="group">Nhóm (không cần link)</option>
        </select>
        <select value={status} onChange={(e)=>{ setStatus(e.target.value); setPage(1); }} className="border rounded-xl px-3 py-2">
          <option value="">(Tất cả trạng thái)</option>
          <option value="1">Hiển thị (1)</option>
          <option value="0">Ẩn (0)</option>
        </select>
        <div />
      </div>

      <ErrorPanel error={err} />

      <div className="overflow-auto rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Tên</th>
              <th className="text-left px-3 py-2">Link</th>
              <th className="text-left px-3 py-2">Loại</th>
              <th className="text-left px-3 py-2">Vị trí</th>
              <th className="text-left px-3 py-2">Cha</th>
              <th className="text-left px-3 py-2">Thứ tự</th>
              <th className="text-left px-3 py-2">TT</th>
              <th className="text-left px-3 py-2">Ngày nhập</th>
              <th className="text-right px-3 py-2">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-500">Đang tải…</td></tr>}
            {!loading && rows?.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-500">Không có dữ liệu.</td></tr>}
            {!loading && rows?.map((r)=>(
              <tr key={r.id} className="hover:bg-gray-50/60">
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2">{r.link}</td>
                <td className="px-3 py-2">{r.type}</td>
                <td className="px-3 py-2">{r.position}</td>
                <td className="px-3 py-2">{r.parent_id ?? 0}</td>
                <td className="px-3 py-2">{r.sort_order ?? 0}</td>
                <td className="px-3 py-2">{String(r.status)}</td>
                <td className="px-3 py-2">{fmtDT(r.created_at)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/menu/${r.id}`} className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border" title="Xem">
                      <Icon.Eye />
                    </Link>
                    <Link href={`/admin/menu/${r.id}/edit`} className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black text-white" title="Sửa">
                      <Icon.Edit />
                    </Link>
                    <button onClick={()=>removeRow(r)} className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-red-600" title="Ẩn">
                      <Icon.Trash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pg?.last_page > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <div>Tổng {pg.total}</div>
          <div className="flex gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className={cx("px-3 py-1.5 rounded border", page<=1 && "opacity-40 pointer-events-none")}>← Trước</button>
            <span>Trang {pg.current_page}/{pg.last_page}</span>
            <button disabled={page>=pg.last_page} onClick={()=>setPage(p=>Math.min(pg.last_page,p+1))} className={cx("px-3 py-1.5 rounded border", page>=pg.last_page && "opacity-40 pointer-events-none")}>Sau →</button>
          </div>
        </div>
      )}
    </div>
  );
}
