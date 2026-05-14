"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

const BASE_API = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "") + "/api/v1";

const Button = ({ variant="primary", className="", ...props }) => {
  const map = {
    primary: "bg-black text-white hover:opacity-90",
    secondary: "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };
  return <button className={`inline-flex items-center gap-2 px-3.5 h-10 rounded-xl text-sm font-medium ${map[variant]} ${className}`} {...props} />;
};

export default function AdminPostsPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const [q, setQ] = useState(sp.get("q") || "");
  const [topic, setTopic] = useState(sp.get("topic") || "");
  const [status, setStatus] = useState(sp.get("status") || "");
  const [page, setPage] = useState(Math.max(1, Number(sp.get("page") || 1)));
  const [perPage, setPerPage] = useState(10);

  const [rows, setRows] = useState([]);
  const [topics, setTopics] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const listUrl = useMemo(() => {
    const u = new URL(`${BASE_API}/posts`);
    u.searchParams.set("per_page", String(perPage));
    u.searchParams.set("page", String(page));
    u.searchParams.set("post_type", "post");
    if (q) u.searchParams.set("q", q);
    if (topic) u.searchParams.set("topic_id", topic);
    if (status !== "") u.searchParams.set("status", status);
    u.searchParams.set("_ts", String(Date.now()));
    return u.toString();
  }, [q, topic, status, page, perPage]);

  useEffect(() => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (topic) usp.set("topic", topic);
    if (status !== "") usp.set("status", status);
    usp.set("page", String(page));
    router.replace(`/admin/posts?${usp.toString()}`);
  }, [q, topic, status, page, router]);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    Promise.all([
      fetch(listUrl, { cache: "no-store" }).then(r => r.json()),
      fetch(`${BASE_API}/topics?withCounts=1&_ts=${Date.now()}`, { cache: "no-store" }).then(r => r.json()).catch(()=>[])
    ]).then(([listRes, topicsRes]) => {
      if (!alive) return;
      const data = Array.isArray(listRes) ? { data: listRes, last_page: 1 } : listRes;
      setRows(Array.isArray(data?.data) ? data.data : []);
      setTotalPages(data?.last_page || 1);
      setTopics(Array.isArray(topicsRes) ? topicsRes : (topicsRes?.data || []));
    }).finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [listUrl]);

  const toggleStatus = async (row) => {
    const next = Number(row.status) === 1 ? 0 : 1;
    try {
      const res = await fetch(`${BASE_API}/posts/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      if (!res.ok) throw new Error("Cập nhật trạng thái thất bại");
      setRows(list => list.map(x => x.id === row.id ? { ...x, status: next } : x));
    } catch (e) {
      alert(e.message);
    }
  };

  const removeRow = async (row) => {
    if (!confirm(`Xoá bài "${row.title}"?`)) return;
    try {
      const res = await fetch(`${BASE_API}/posts/${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xoá thất bại");
      setRows(list => list.filter(x => x.id !== row.id));
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bài viết</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/posts/trash">
            <button className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50 inline-flex items-center gap-1">
              🗑️ Thùng rác
            </button>
          </Link>
          <Link href="/admin/posts/new"><Button>+ Thêm bài viết</Button></Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4 bg-white p-4 rounded-xl border">
        <input value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} placeholder="Tìm tiêu đề..." className="h-10 rounded-xl border px-3 text-sm"/>
        <select value={topic} onChange={(e)=>{ setTopic(e.target.value); setPage(1); }} className="h-10 rounded-xl border px-3 text-sm bg-white">
          <option value="">Tất cả chủ đề</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={status} onChange={(e)=>{ setStatus(e.target.value); setPage(1); }} className="h-10 rounded-xl border px-3 text-sm bg-white">
          <option value="">Mọi trạng thái</option>
          <option value="1">Hiển thị</option>
          <option value="0"></option>
        </select>
        <select value={perPage} onChange={(e)=>{ setPerPage(Number(e.target.value)); setPage(1); }} className="h-10 rounded-xl border px-3 text-sm bg-white">
          {[10,20,50,100].map(n => <option key={n} value={n}>{n}/trang</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Tiêu đề</th>
                <th className="px-4 py-3 text-left">Chủ đề</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Ngày</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">Đang tải…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">Chưa có bài viết</td></tr>
              )}
              {!loading && rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-900 line-clamp-2">{row.title}</td>
                  <td className="px-4 py-3 text-gray-700">{row.topic?.name || "—"}</td>
                  <td className="px-4 py-3">
                    {Number(row.status) === 1
                      ? <span className="rounded-full bg-green-100 text-green-800 text-xs px-2 py-0.5">✓ Hiển thị</span>
                      : <span className="rounded-full bg-gray-200 text-gray-700 text-xs px-2 py-0.5">Ẩn</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.created_at ? new Date(row.created_at).toLocaleString("vi-VN") : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/posts/${row.id}`}><Button variant="secondary">👁️</Button></Link>
                      <Link href={`/admin/posts/${row.id}/edit`}><Button variant="secondary">✏️</Button></Link>
                      <Button variant="secondary" onClick={()=>toggleStatus(row)}>{Number(row.status)===1 ? "Ẩn" : "Hiển thị"}</Button>
                      <Button variant="danger" onClick={()=>removeRow(row)}>🗑️ Xoá</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
            <div/>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={()=>setPage(p=>Math.max(1, p-1))} disabled={page<=1}>← Trước</Button>
              <span>Trang <b>{page}</b>/<b>{totalPages}</b></span>
              <Button variant="secondary" onClick={()=>setPage(p=>Math.min(totalPages, p+1))} disabled={page>=totalPages}>Sau →</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
