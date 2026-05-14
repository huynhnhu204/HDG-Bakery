"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";

const cx = (...xs) => xs.filter(Boolean).join(" ");

async function api(path, { method="GET", body } = {}) {
  const headers = { Accept:"application/json" };
  if (body) headers["Content-Type"]="application/json";
  const res = await fetch(`${BASE}${API}${path}`, { method, headers, cache:"no-store", body: body?JSON.stringify(body):undefined });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function AdminBannersList() {
  const [q,setQ]=useState("");
  const [position,setPosition]=useState("slideshow");
  const [status,setStatus]=useState("1");
  const [rows,setRows]=useState([]);
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  async function load(){
    setLoading(true); setErr("");
    try{
      const qs = new URLSearchParams();
      if (q) qs.set("q", q);
      if (position) qs.set("position", position);
      if (status!=="") qs.set("status", status);
      qs.set("per_page","0");
      const data = await api(`/banners?${qs.toString()}`);
      setRows(Array.isArray(data)?data:(data?.data||[]));
    }catch(e){ setErr(e.message||"Load failed"); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [position, status]);

  async function removeRow(id){
    if (!confirm("Xoá banner này?")) return;
    try{ await api(`/banners/${id}`, { method:"DELETE" }); await load(); }
    catch(e){ alert(e.message||"Xoá thất bại"); }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Banners</h1>
          <p className="text-gray-500 text-sm">Quản lý slideshow / quảng cáo.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/banners/trash" className="px-3 py-2 rounded-xl border hover:bg-gray-50">🗑️ Thùng rác</Link>
          <Link href="/admin/banners/new" className="px-3 py-2 rounded-xl bg-black text-white">+ Thêm banner</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        <div className="md:col-span-2 flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm theo tên…" className="border rounded-xl px-3 py-2 w-full"/>
          <button onClick={load} className="px-3 py-2 rounded-xl bg-black text-white">Tìm</button>
        </div>
        <select value={position} onChange={e=>setPosition(e.target.value)} className="border rounded-xl px-3 py-2">
          <option value="slideshow">Slideshow</option>
          <option value="ads">Quảng cáo</option>
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-xl px-3 py-2">
          <option value="">(Tất cả)</option>
          <option value="1">Hiển thị</option>
          <option value="0">Ẩn</option>
        </select>
      </div>

      {err && <div className="mb-3 rounded-xl bg-red-50 text-red-600 px-4 py-3">{err}</div>}

      <div className="overflow-auto rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Ảnh</th>
              <th className="text-left px-3 py-2">Tên</th>
              <th className="text-left px-3 py-2">Vị trí</th>
              <th className="text-left px-3 py-2">Thứ tự</th>
              <th className="text-left px-3 py-2">TT</th>
              <th className="text-right px-3 py-2">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">Đang tải…</td></tr>}
            {!loading && rows.length===0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">Không có dữ liệu.</td></tr>}
            {!loading && rows.map(b=>(
              <tr key={b.id} className="hover:bg-gray-50/60">
                <td className="px-3 py-2">
                  <img src={b.image_url || b.image} alt={b.name} className="h-12 w-auto rounded object-cover"/>
                </td>
                <td className="px-3 py-2 font-medium">
                  <Link href={`/admin/banners/${b.id}`} className="hover:underline">{b.name}</Link>
                </td>
                <td className="px-3 py-2">{b.position}</td>
                <td className="px-3 py-2">{b.sort_order ?? 0}</td>
                <td className="px-3 py-2">{String(b.status)}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/banners/${b.id}/edit`} className="px-2.5 py-1.5 rounded-lg bg-black text-white">Sửa</Link>
                    <button onClick={()=>removeRow(b.id)} className="px-2.5 py-1.5 rounded-lg border text-red-600">Xoá</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
