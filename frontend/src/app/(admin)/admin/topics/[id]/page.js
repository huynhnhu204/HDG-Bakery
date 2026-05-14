"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Head from "next/head";
import Link from "next/link";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

async function getJSON(url) {
  const t = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  const r = await fetch(url, {
    headers: { Accept: "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    cache: "no-store",
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.message || `${r.status} ${r.statusText}`);
  return d;
}

export default function TopicViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [topic, setTopic]   = useState(null);
  const [posts, setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]       = useState("");
  const [page, setPage]     = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal]   = useState(0);

  const perPage = 10;

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setErr("");
    try {
      const [topicRes, postRes] = await Promise.all([
        getJSON(`${BASE}${API}/topics/${id}`),
        getJSON(`${BASE}${API}/posts?post_type=post&topic_id=${id}&per_page=${perPage}&page=${page}`)
      ]);
      setTopic(topicRes);
      setPosts(postRes?.data || []);
      setLastPage(postRes?.last_page || 1);
      setTotal(postRes?.total || 0);
    } catch (e) {
      setErr(e.message || "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, page]);

  const removeTopic = async () => {
    if (!confirm("Ẩn (disable) topic này?")) return;
    try {
      const t = localStorage.getItem(KEY);
      const r = await fetch(`${BASE}${API}/topics/${id}`, {
        method: "DELETE",
        headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      });
      if (!r.ok) throw new Error("Thao tác thất bại");
      alert("Đã chuyển topic sang trạng thái Ẩn");
      router.push("/admin/topics");
    } catch (e) {
      alert(e.message || "Lỗi thao tác");
    }
  };

  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!topic || loading) return <div className="p-6">Đang tải…</div>;

  const statusBadge = (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        String(topic.status) === "1"
          ? "bg-green-100 text-green-800"
          : "bg-gray-200 text-gray-700"
      }`}
    >
      {String(topic.status) === "1" ? "Hiển thị" : "Ẩn"}
    </span>
  );

  return (
    <>
      <Head>
        <title>Topic: {topic.name} - Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500">
          <button onClick={() => router.push("/admin/topics")} className="hover:underline">
            Topics
          </button>
          <span className="mx-1">/</span>
          <span className="text-gray-800">Xem #{id}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{topic.name}</h1>
            <div className="mt-1 text-sm text-gray-600">
              Slug: <b className="text-gray-900">{topic.slug}</b> • {statusBadge}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/posts/new?topic_id=${id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:opacity-90"
            >
              <Plus size={18} /> Bài viết mới
            </Link>
            <Link
              href={`/news?cat=${id}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:opacity-90"
              title="Xem ngoài site"
            >
              <Eye size={18} /> Xem ngoài site
            </Link>
            <Link
              href={`/admin/topics/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:opacity-90"
              title="Sửa"
            >
              <Pencil size={18} /> Sửa
            </Link>
            <button
              onClick={removeTopic}
              className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:opacity-90"
              title="Ẩn topic"
            >
              <Trash2 size={18} /> Ẩn
            </button>
          </div>
        </div>

        {/* Description */}
        {topic.description ? (
          <div className="rounded-xl border bg-white p-4 text-sm text-gray-700">
            <div className="font-medium mb-1">Mô tả</div>
            <div className="prose max-w-none prose-p:my-2">
              {String(topic.description).trim().startsWith("<") ? (
                <div dangerouslySetInnerHTML={{ __html: topic.description }} />
              ) : (
                <p>{topic.description}</p>
              )}
            </div>
          </div>
        ) : null}

        {/* Posts in topic */}
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold">
              Bài viết trong Topic • Tổng <span className="text-gray-900">{total}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium text-gray-600">Tiêu đề</th>
                  <th className="px-4 py-2 font-medium text-gray-600">Trạng thái</th>
                  <th className="px-4 py-2 font-medium text-gray-600">Ngày tạo</th>
                  <th className="px-4 py-2 font-medium text-gray-600 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      Chưa có bài viết trong topic này.
                    </td>
                  </tr>
                ) : posts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900 line-clamp-1">{p.title}</div>
                      {p.description ? (
                        <div className="text-xs text-gray-500 line-clamp-1">{p.description}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        String(p.status)==="1" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                      }`}>
                        {String(p.status)==="1" ? "Hiển thị" : "Ẩn"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {p.created_at ? new Date(p.created_at).toLocaleString("vi-VN") : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/posts/${p.id}`} title="Xem">
                          <button className="p-2 rounded-lg bg-black text-white hover:opacity-90"><Eye size={18} /></button>
                        </Link>
                        <Link href={`/admin/posts/${p.id}/edit`} title="Sửa">
                          <button className="p-2 rounded-lg bg-black text-white hover:opacity-90"><Pencil size={18} /></button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lastPage > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <div />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg bg-black px-3 py-1.5 text-white disabled:opacity-40 hover:opacity-90"
                >
                  ← Trước
                </button>
                <span>Trang <b>{page}</b> / {lastPage}</span>
                <button
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  disabled={page >= lastPage}
                  className="rounded-lg bg-black px-3 py-1.5 text-white disabled:opacity-40 hover:opacity-90"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
