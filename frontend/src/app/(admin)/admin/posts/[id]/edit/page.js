"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Head from "next/head";
import dynamic from "next/dynamic";
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

const toSlug = (str = "") =>
  String(str)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-");

export default function PostEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({
    title: "", topic_id: "", description: "", image: "", content: "", status: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);

  const slug = useMemo(() => toSlug(form.title || ""), [form.title]);

  const coverInputRef = useRef(null);
  const quillImageInputRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        // topics
        const tRes = await fetch(`${BASE}${API}/topics?withCounts=1`, { cache: "no-store" });
        const tData = await tRes.json();
        const arr = Array.isArray(tData) ? tData : (tData?.data || []);
        if (alive) setTopics(arr);

        // post
        const r = await fetch(`${BASE}${API}/posts/${id}`, { cache: "no-store" });
        const d = await r.json();
        if (!r.ok) throw new Error(d?.message || "Load failed");
        if (alive) {
          setForm({
            title: d?.title || "",
            topic_id: d?.topic_id ?? "",
            description: d?.description || "",
            image: d?.image || "",
            content: d?.content || "",
            status: String(d?.status ?? 1) === "1",
          });
        }
      } catch (e) {
        setErr(e?.message || "Không tải được dữ liệu.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  async function uploadToStorage(file, folder = "uploads") {
    if (!file) throw new Error("No file selected");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);

    const token = (typeof window !== "undefined") ? localStorage.getItem(KEY) : null;
    setUploading(true);
    try {
      const r = await fetch(`${BASE}${API}/storage/upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: fd,
      });
      const d = await r.json();
      if (!r.ok || !d?.success) {
        throw new Error(d?.message || "Upload failed");
      }
      return d; // { url, success, ... }
    } finally {
      setUploading(false);
    }
  }

  function buildQuillModules() {
    return {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image", "blockquote", "code-block"],
          [{ align: [] }],
          ["clean"],
        ],
        handlers: {
          image: () => {
            quillImageInputRef.current?.click();
          },
        },
      },
      clipboard: { matchVisual: true },
    };
  }

  async function onPickCover() {
    coverInputRef.current?.click();
  }

  async function onCoverFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");

    // Preview ngay
    const previewUrl = URL.createObjectURL(file);
    setForm((s) => ({ ...s, image: previewUrl }));

    try {
      const d = await uploadToStorage(file, "posts");
      // Thay preview bằng URL thật
      setForm((s) => ({ ...s, image: d.url }));
      console.log("Upload cover thành công:", d.url);
    } catch (er) {
      setErr(er?.message || "Upload ảnh thất bại.");
      setForm((s) => ({ ...s, image: "" }));
    } finally {
      e.target.value = "";
    }
  }

  async function onQuillImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const d = await uploadToStorage(file, "posts");
      const quill = document.querySelector(".ql-editor")?.__quill;
      if (quill) {
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, "image", d.url, "user");
        quill.setSelection(range.index + 1, 0);
      } else {
        setForm((s) => ({ ...s, content: (s.content || "") + `<p><img src="${d.url}" /></p>` }));
      }
    } catch (er) {
      setErr(er?.message || "Upload ảnh nội dung thất bại.");
    } finally {
      e.target.value = "";
    }
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.title.trim()) { setErr("Tiêu đề bắt buộc."); return; }
    if (!form.content || !String(form.content).trim()) { setErr("Nội dung bắt buộc."); return; }

    try {
      setSaving(true);
      const tk = (typeof window !== "undefined") ? localStorage.getItem(KEY) : null;
      const r = await fetch(`${BASE}${API}/posts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
        },
        body: JSON.stringify({
          topic_id: form.topic_id || null,
          title: form.title.trim(),
          slug,
          image: form.image || "",
          content: form.content,
          description: form.description || "",
          post_type: "post",
          status: form.status ? 1 : 0,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.message || "Cập nhật thất bại");
      }
      router.push(`/admin/posts/${id}`);
    } catch (e) {
      setErr(e.message || "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Đang tải bài viết…</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <div className="p-6 max-w-4xl animate-pulse">
          <div className="h-5 w-40 bg-gray-200 rounded mb-3" />
          <div className="h-8 w-64 bg-gray-200 rounded mb-6" />
          <div className="h-10 w-full bg-gray-200 rounded mb-4" />
          <div className="h-64 w-full bg-gray-200 rounded" />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Sửa Bài viết #{id} - Admin</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content={`Chỉnh sửa bài viết #${id}`} />
      </Head>

      <section className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center text-sm text-gray-600" aria-label="Breadcrumb">
          <button
            onClick={() => router.push("/admin/posts")}
            className="hover:text-blue-600 transition-colors"
            aria-label="Quay lại danh sách bài viết"
          >
            Bài viết
          </button>
          <span className="mx-2">/</span>
          <span className="text-gray-800 font-medium">Sửa #{id}</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Sửa bài viết</h1>

        <form onSubmit={submit} className="bg-white shadow-lg rounded-xl p-6 space-y-6">
          {err && (
            <div
              className="rounded-lg bg-red-50 text-red-700 text-sm p-4"
              role="alert"
              aria-live="assertive"
            >
              {err}
            </div>
          )}

          {/* Tiêu đề */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Nhập tiêu đề bài viết…"
              required
              aria-required="true"
            />
            <p className="mt-1 text-xs text-gray-500">
              Slug: <span className="font-medium text-gray-700">{slug || "…"}</span>
            </p>
          </div>

          {/* Topic & Trạng thái */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề</label>
              <select
                value={form.topic_id ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, topic_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="">— Không có —</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select
                value={form.status ? "1" : "0"}
                onChange={(e) => setForm((s) => ({ ...s, status: e.target.value === "1" }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="1">Hiển thị</option>
                <option value="0">Ẩn</option>
              </select>
            </div>
          </div>

          {/* Ảnh đại diện */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh đại diện</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={form.image}
                onChange={(e) => setForm((s) => ({ ...s, image: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Dán URL ảnh hoặc chọn file"
              />
              <button
                type="button"
                onClick={onPickCover}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm bg-white hover:bg-gray-100 transition disabled:opacity-50"
                disabled={uploading}
                aria-label="Chọn ảnh đại diện"
              >
                {uploading ? "Đang tải…" : "Chọn ảnh"}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onCoverFileChange}
                aria-hidden="true"
              />
            </div>

            {form.image && (
              <div className="mt-4">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img
                      src={form.image}
                      alt="Ảnh đại diện bài viết"
                      className="w-48 h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                      onError={(e) => {
                        e.currentTarget.src = "/cake1.jpg"; // fallback
                      }}
                    />
                    {uploading && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <div className="text-white text-sm font-medium">Đang tải lên...</div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setForm((s) => ({ ...s, image: "" }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition"
                      aria-label="Xóa ảnh đại diện"
                      title="Xóa ảnh"
                      disabled={uploading}
                    >
                      ×
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 flex-1">
                    {uploading ? (
                      <p className="font-medium mb-1 text-blue-600">⏳ Đang tải lên ảnh...</p>
                    ) : form.image.startsWith("blob:") ? (
                      <p className="font-medium mb-1 text-yellow-600">📷 Xem trước ảnh (chưa lưu)</p>
                    ) : (
                      <p className="font-medium mb-1 text-green-600">✓ Ảnh đã được tải lên thành công</p>
                    )}
                    <p className="break-all line-clamp-2 text-xs bg-gray-50 p-2 rounded border">
                      {form.image}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      {uploading ? "Vui lòng chờ..." : "Ảnh này sẽ hiển thị trên trang tin tức"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mô tả ngắn */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả ngắn</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Nhập mô tả ngắn gọn cho bài viết…"
            />
          </div>

          {/* Nội dung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nội dung <span className="text-red-500">*</span>
            </label>
            <div className="rounded-lg border border-gray-300">
              <ReactQuill
                value={form.content}
                onChange={(v) => setForm((s) => ({ ...s, content: v }))}
                modules={buildQuillModules()}
                theme="snow"
                className="bg-white"
              />
            </div>
            <input
              ref={quillImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onQuillImageChange}
              aria-hidden="true"
            />
          </div>

          {/* Nút hành động */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 transition disabled:bg-blue-400 disabled:cursor-not-allowed"
              aria-label="Lưu thay đổi"
            >
              {saving ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
              aria-label="Huỷ"
            >
              Huỷ
            </button>
          </div>
        </form>

        <footer className="mt-6 text-xs text-gray-600"></footer>
      </section>
    </>
  );
}
