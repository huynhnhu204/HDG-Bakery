"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/,"");
const API  = "/api/v1";
const PER  = 20;
const ADMIN_TOKEN_KEY = "admin_token";

export default function StockInListPage() {
  const [tab, setTab] = useState("receipts"); // receipts | movements
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [filterStatus, setFilterStatus] = useState(""); // "" = all, "0" = nháp, "1" = đã xác nhận
  const [page, setPage]         = useState(1);
  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [last, setLast]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [deletingId, setDeletingId] = useState(0);
  const [warehouses, setWarehouses] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  // movements state
  const [mvts, setMvts] = useState([]);
  const [loadingM, setLoadingM] = useState(false);
  const [pageM, setPageM] = useState(1);
  const [lastM, setLastM] = useState(1);

  function getAuthHeaders() {
    const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
    return {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function load() {
    setLoading(true);
    setErrorMsg("");
    try {
      const u = new URL(`${BASE}${API}/stock-ins`);
      u.searchParams.set("page", String(page));
      u.searchParams.set("per_page", String(PER));
      if (q) u.searchParams.set("q", q);
      if (dateFrom) u.searchParams.set("date_from", dateFrom);
      if (dateTo)   u.searchParams.set("date_to", dateTo);
      if (filterStatus !== "") u.searchParams.set("status", filterStatus);
      const res = await fetch(u, { headers: getAuthHeaders(), cache: "no-store" });
      const j   = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`);
      setRows(j?.data || []);
      setTotal(j?.total || 0);
      setLast(j?.last_page || 1);
      
      // Lấy danh sách kho từ dữ liệu
      const whList = [...new Set((j?.data || []).map(r => r.warehouse).filter(Boolean))];
      setWarehouses(whList);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setLast(1);
      setErrorMsg(e?.message || "Không tải được dữ liệu phiếu nhập");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, dateFrom, dateTo, filterStatus, page]);

  async function loadMovements() {
    setLoadingM(true);
    setErrorMsg("");
    try {
      const u = new URL(`${BASE}${API}/stocks`);
      u.searchParams.set("page", String(pageM));
      u.searchParams.set("per_page", String(50));
      if (q) u.searchParams.set("q", q);
      if (dateFrom) u.searchParams.set("date_from", dateFrom);
      if (dateTo)   u.searchParams.set("date_to", dateTo);
      const res = await fetch(u, { headers: getAuthHeaders(), cache: "no-store" });
      const j   = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`);
      setMvts(j?.data || []);
      setLastM(j?.last_page || 1);
    } catch (e) {
      setMvts([]);
      setLastM(1);
      setErrorMsg(e?.message || "Không tải được dữ liệu dòng kho");
    } finally {
      setLoadingM(false);
    }
  }

  useEffect(() => {
    if (tab === "movements") loadMovements();
    // eslint-disable-next-line
  }, [tab, q, dateFrom, dateTo, pageM]);

  const movementSummary = useMemo(() => {
    const sum = { IN:0, OUT:0, RESERVE:0, RELEASE:0 };
    for (const r of mvts) {
      const t = (r.type||"").toUpperCase();
      const qty = Number(r.qty||0);
      if (t in sum) sum[t] += qty;
    }
    const net = sum.IN + sum.RELEASE + sum.OUT + sum.RESERVE; // OUT/RESERVE thường là số âm trong DB
    return { ...sum, NET: net };
  }, [mvts]);

  async function onDelete(id) {
    if (!confirm("Xoá phiếu này?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${BASE}${API}/stock-ins/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`);
      // reload danh sách
      load();
    } catch (e) {
      alert("❌ " + (e.message || "Xoá thất bại"));
    } finally {
      setDeletingId(0);
    }
  }

  const IconEye = (props)=>(
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
  const IconEdit = (props)=>(
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"></path>
    </svg>
  );
  const IconTrash = (props)=>(
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"></path>
      <path d="M10 11v6M14 11v6"></path>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"></path>
    </svg>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Phiếu nhập kho</h1>
          <p className="text-gray-500 text-sm">Quản lý danh sách phiếu nhập</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/stocks/new" className="px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800">
            + Tạo phiếu nhập
          </Link>
          <Link href="/admin/stocks/import" className="px-3 py-2 border rounded-lg hover:bg-gray-100">
            Import CSV
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-3 bg-white border rounded-xl p-4">
        <input value={q} onChange={(e)=>{ setPage(1); setQ(e.target.value); }} placeholder="Tìm theo mã/supplier/note…" className="border rounded px-3 py-2" />
        <input type="date" value={dateFrom} onChange={(e)=>{ setPage(1); setDateFrom(e.target.value); }} className="border rounded px-3 py-2" />
        <input type="date" value={dateTo} onChange={(e)=>{ setPage(1); setDateTo(e.target.value); }} className="border rounded px-3 py-2" />
        <select value={filterStatus} onChange={(e)=>{ setPage(1); setFilterStatus(e.target.value); }} className="border rounded px-3 py-2">
          <option value="">Tất cả</option>
          <option value="0">Nháp</option>
          <option value="1">Đã xác nhận</option>
        </select>
        <div className="text-sm self-center text-right text-gray-600">Tổng: <b>{total}</b></div>
      </div>

      {errorMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={()=>setTab("receipts")} className={`px-3 py-2 rounded-lg border ${tab==='receipts'?'bg-black text-white':'bg-white'}`}>Phiếu nhập</button>
        <button onClick={()=>setTab("movements")} className={`px-3 py-2 rounded-lg border ${tab==='movements'?'bg-black text-white':'bg-white'}`}>Dòng kho & Tổng hợp</button>
      </div>

      {tab === 'receipts' && (
      <div className="bg-white border rounded-2xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Mã phiếu</th>
              <th className="p-3 text-left">Ngày nhập</th>
              <th className="p-3 text-left">Kho</th>
              <th className="p-3 text-left">Nhà cung cấp</th>
              <th className="p-3 text-center">Tổng SL</th>
              <th className="p-3 text-left">Tổng tiền</th>
              <th className="p-3 text-center">Trạng thái</th>
              <th className="p-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={8} className="p-8 text-center text-gray-500">Đang tải…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-400">Không có phiếu</td></tr>}
            {!loading && rows.map((r)=>(
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="p-3 font-medium">{r.code}</td>
                <td className="p-3">{r.date}</td>
                <td className="p-3">{r.warehouse || "—"}</td>
                <td className="p-3">{r.supplier || "—"}</td>
                <td className="p-3 text-center">{r.total_qty}</td>
                <td className="p-3">{Math.round(Number(r.total_cost||0)).toLocaleString("vi-VN")} đ</td>
                <td className="p-3 text-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    r.status === 1 
                      ? "bg-green-100 text-green-700" 
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {r.status === 1 ? "Đã xác nhận" : "Nháp"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/stocks/${r.id}`}
                      title="Xem chi tiết"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-gray-100"
                    >
                      <IconEye /> <span className="hidden sm:inline">Xem</span>
                    </Link>
                    <Link
                      href={`/admin/stocks/${r.id}/edit`}
                      title="Sửa phiếu"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-gray-100"
                    >
                      <IconEdit /> <span className="hidden sm:inline">Sửa</span>
                    </Link>
                    <button
                      title="Xoá phiếu"
                      onClick={()=>onDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-gray-100 disabled:opacity-60"
                    >
                      <IconTrash />
                      <span className="hidden sm:inline">
                        {deletingId === r.id ? "Đang xoá…" : "Xoá"}
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
          <div>Trang <b>{page}</b>/<b>{last}</b></div>
          <div className="flex gap-2">
            <button className="px-3 h-9 rounded border disabled:opacity-50" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>← Trước</button>
            <button className="px-3 h-9 rounded border disabled:opacity-50" disabled={page>=last} onClick={()=>setPage(p=>Math.min(last,p+1))}>Sau →</button>
          </div>
        </div>
      </div>
      )}

      {tab === 'movements' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid md:grid-cols-5 gap-3">
            {[
              {k:'IN', label:'Nhập (IN)', color:'text-green-700'},
              {k:'OUT', label:'Xuất (OUT)', color:'text-red-700'},
              {k:'RESERVE', label:'Giữ chỗ', color:'text-amber-700'},
              {k:'RELEASE', label:'Hoàn tồn', color:'text-blue-700'},
              {k:'NET', label:'Thay đổi ròng', color:'text-black'},
            ].map(x=> (
              <div key={x.k} className="bg-white border rounded-xl p-4">
                <div className="text-xs text-gray-500">{x.label}</div>
                <div className={`text-xl font-semibold ${x.color}`}>{movementSummary[x.k]||0}</div>
              </div>
            ))}
          </div>

          {/* Movements table */}
          <div className="bg-white border rounded-2xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Sản phẩm</th>
                  <th className="p-3 text-left">Loại</th>
                  <th className="p-3 text-right">SL</th>
                  <th className="p-3 text-left">Chứng từ</th>
                  <th className="p-3 text-left">Ghi chú</th>
                  <th className="p-3 text-left">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingM && <tr><td colSpan={6} className="p-8 text-center text-gray-500">Đang tải…</td></tr>}
                {!loadingM && mvts.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">Không có dòng kho</td></tr>}
                {!loadingM && mvts.map((r)=> (
                  <tr key={r.id}>
                    <td className="p-3">#{r.product_id}</td>
                    <td className="p-3">{r.type || '—'}</td>
                    <td className={`p-3 text-right ${Number(r.qty)<0?'text-red-600':'text-green-700'}`}>{r.qty}</td>
                    <td className="p-3">{r.ref_type || '—'} {r.ref_id?`#${r.ref_id}`:''}</td>
                    <td className="p-3">{r.note || '—'}</td>
                    <td className="p-3">{r.created_at || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <div>Trang <b>{pageM}</b>/<b>{lastM}</b></div>
              <div className="flex gap-2">
                <button className="px-3 h-9 rounded border disabled:opacity-50" disabled={pageM<=1} onClick={()=>setPageM(p=>Math.max(1,p-1))}>← Trước</button>
                <button className="px-3 h-9 rounded border disabled:opacity-50" disabled={pageM>=lastM} onClick={()=>setPageM(p=>Math.min(lastM,p+1))}>Sau →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
