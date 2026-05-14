"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Head from "next/head";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, Eye, Calendar, User, Tag } from "lucide-react";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";

export default function PostViewPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const [row, setRow] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${BASE}${API}/posts/${id}`, { cache: "no-store" });
        const d = await r.json();
        if (!r.ok) throw new Error(d?.message || "Load failed");
        setRow(d);
      } catch (e) {
        setErr(e.message || "Không tải được dữ liệu");
      }
    })();
  }, [id]);

  if (err) return (
    <div className="min-h-screen w-full bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl rounded-xl bg-white p-6 shadow-sm border">
        <div className="p-6 text-red-600 text-center">{err}</div>
      </div>
    </div>
  );
  
  if (!row) return (
    <div className="min-h-screen w-full bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl rounded-xl bg-white p-6 shadow-sm border">
        <div className="p-6 text-center">Đang tải…</div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Xem bài viết #{id} - Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="min-h-screen w-full bg-gray-50 py-10">
        <div className="mx-auto max-w-6xl rounded-xl bg-white p-6 shadow-sm border">
          {/* Breadcrumb / Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/admin/posts" className="inline-flex items-center gap-2 hover:underline">
                <ArrowLeft size={16} /> Danh sách bài viết
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">#{id}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/posts/${id}/edit`}
                className="px-3 py-2 rounded-lg border hover:bg-gray-50 inline-flex items-center gap-2"
                title="Sửa"
              >
                <Edit size={16} /> Sửa
              </Link>
              <Link
                href={`/news/${row.slug}`}
                target="_blank"
                className="px-3 py-2 rounded-lg border hover:bg-gray-50 inline-flex items-center gap-2"
                title="Xem ngoài site"
              >
                <Eye size={16} /> Xem ngoài site
              </Link>
            </div>
          </div>

          {/* Title */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{row.title}</h1>
            <p className="text-sm text-gray-600">ID: #{row.id}</p>
          </div>

          {/* Status & Topic */}
          <div className="mb-6 p-4 bg-white border rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Thông tin cơ bản</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-gray-500" />
                <span className="text-sm text-gray-600">Chủ đề:</span>
                <span className="font-medium">{row.topic?.name || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Trạng thái:</span>
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                  String(row.status)==="1" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-gray-200 text-gray-700"
                }`}>
                  {String(row.status)==="1" ? "Hiển thị" : "Ẩn"}
                </span>
              </div>
            </div>
          </div>

          {/* Date Info */}
          <div className="mb-6 p-4 bg-white border rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Thông tin thời gian</h3>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              <span className="text-sm text-gray-600">Ngày tạo:</span>
              <span className="font-medium">{row.created_at ? new Date(row.created_at).toLocaleString("vi-VN") : "—"}</span>
            </div>
          </div>

          {/* Image */}
          {row.image && (
            <div className="mb-6 p-4 bg-white border rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Ảnh đại diện</h3>
              <div className="rounded-lg overflow-hidden border shadow-sm">
                <img 
                  src={row.image} 
                  alt={row.title}
                  className="w-full h-64 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/cake1.jpg";
                  }}
                />
              </div>
            </div>
          )}

          {/* Description */}
          {row.description && (
            <div className="mb-6 p-4 bg-white border rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Mô tả ngắn</h3>
              <p className="text-gray-700 leading-relaxed">{row.description}</p>
            </div>
          )}

          {/* Content */}
          <div className="p-4 bg-white border rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Nội dung bài viết</h3>
            <div className="prose max-w-none prose-p:text-gray-700 prose-headings:text-gray-900">
              {typeof row.content === "string" && row.content.trim().startsWith("<")
                ? <div dangerouslySetInnerHTML={{ __html: row.content }} />
                : <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">{row.content}</pre>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
