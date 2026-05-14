"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

export default function BannerEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name: "",
    link: "",
    position: "slideshow",
    sort_order: 0,
    description: "",
    status: 1,
    image: "",
    image_file: null,
    image_preview: "",
  });

  // Load chi tiết
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const t = localStorage.getItem(KEY);
        const res = await fetch(`${BASE}${API}/banners/${id}`, {
          headers: t ? { Authorization: `Bearer ${t}` } : {},
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const x = await res.json();
        setF(s => ({
          ...s,
          name: x.name ?? "",
          link: x.link ?? "",
          position: x.position ?? "slideshow",
          sort_order: x.sort_order ?? 0,
          description: x.description ?? "",
          status: x.status ?? 1,
          image: x.image ?? "",
          image_preview: x.image_url || (x.image ? `${BASE}/${x.image}` : ""),
        }));
      } catch (e) {
        alert("❌ Không tải được banner: " + (e?.message || e));
        router.push("/admin/banners");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Lưu
  async function submit(e) {
    e.preventDefault();
    const t = localStorage.getItem(KEY);
    const fd = new FormData();
    const send = (k, v) => v !== undefined && v !== null && fd.append(k, v);

    // Laravel update: dùng method spoofing
    fd.append("_method", "PUT");

    send("name", f.name);
    send("link", f.link);
    send("position", f.position);
    send("sort_order", String(f.sort_order ?? 0));
    send("description", f.description);
    send("status", f.status ? 1 : 0);
    if (f.image_file) fd.append("image_file", f.image_file);

    try {
      setSaving(true);
      const res = await fetch(`${BASE}${API}/banners/${id}`, {
        method: "POST", // gửi POST + _method=PUT
        headers: t ? { Authorization: `Bearer ${t}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      alert("✅ Cập nhật banner thành công!");
      router.push("/admin/banners");
    } catch (err) {
      // Nếu backend trả HTML error page, hiện ngắn gọn
      const msg = String(err?.message || err);
      alert("❌ Lưu thất bại: " + (msg.length > 400 ? msg.slice(0, 400) + "..." : msg));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">⏳ Đang tải…</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">🖼️ Sửa banner</h1>
        <Link href="/admin/banners" className="px-3 py-2 rounded-lg bg-gray-200">← Về danh sách</Link>
      </div>

      <form onSubmit={submit} className="space-y-5 bg-white rounded-xl shadow p-5">
        <div>
          <label className="block mb-1 font-medium">Tên *</label>
          <input
            required
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            className="border rounded w-full p-2"
            placeholder="VD: Banner Tết"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Liên kết</label>
          <input
            value={f.link}
            onChange={(e) => setF({ ...f, link: e.target.value })}
            className="border rounded w-full p-2"
            placeholder="https://…"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">Vị trí</label>
            <select
              value={f.position}
              onChange={(e) => setF({ ...f, position: e.target.value })}
              className="border rounded w-full p-2"
            >
              <option value="slideshow">Slideshow</option>
              <option value="ads">Quảng cáo</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Thứ tự</label>
            <input
              type="number"
              min="0"
              value={f.sort_order}
              onChange={(e) => setF({ ...f, sort_order: e.target.value })}
              className="border rounded w-full p-2"
            />
          </div>
        </div>

        <div>
          <label className="block mb-1 font-medium">Ảnh</label>
          {f.image_preview && (
            <img src={f.image_preview} alt="" className="w-full max-w-sm rounded border mb-2" />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setF({ ...f, image_file: file, image_preview: URL.createObjectURL(file) });
            }}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Mô tả</label>
          <textarea
            rows={3}
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            className="border rounded w-full p-2"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!f.status}
            onChange={(e) => setF({ ...f, status: e.target.checked ? 1 : 0 })}
          />
          <span>Hiển thị</span>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            {saving ? "Đang lưu…" : "Cập nhật"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/banners")}
            className="bg-gray-300 px-4 py-2 rounded-lg"
          >
            Huỷ
          </button>
        </div>
      </form>
    </div>
  );
}
