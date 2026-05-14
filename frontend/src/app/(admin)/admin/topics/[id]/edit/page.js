"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Head from "next/head";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

const toSlug = (str="") =>
  String(str)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-");

export default function TopicEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [form, setForm] = useState({ name: "", description: "", sort_order: 0, status: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const slug = useMemo(() => toSlug(form.name || ""), [form.name]);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        const t = localStorage.getItem(KEY);
        const r = await fetch(`${BASE}${API}/topics/${id}`, {
          headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
          cache: "no-store",
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d?.message || "Load failed");
        if (alive) {
          setForm({
            name: d?.name || "",
            description: d?.description || "",
            sort_order: d?.sort_order ?? 0,
            status: String(d?.status ?? 1) === "1",
          });
        }
      } catch (e) {
        setErr(e.message || "Không tải được dữ liệu");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.name.trim()) { setErr("Tên topic bắt buộc."); return; }

    try {
      setSaving(true);
      const t = localStorage.getItem(KEY);
      const r = await fetch(`${BASE}${API}/topics/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
        },
        body: JSON.stringify({
          name: form.name.trim(),
          slug,
          description: form.description || "",
          sort_order: Number(form.sort_order) || 0,
          status: form.status ? 1 : 0,
        }),
      });
      if (!r.ok) throw new Error("Cập nhật thất bại");
      router.push(`/admin/topics/${id}`);
    } catch (e) {
      setErr(e.message || "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Đang tải…</div>;

  return (
    <>
      <Head>
        <title>Sửa Topic #{id} - Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="p-6 max-w-3xl">
        <div className="text-sm text-gray-500 mb-2">
          <button onClick={() => router.push("/admin/topics")} className="hover:underline">Topics</button>
          <span className="mx-1">/</span>
          <span className="text-gray-800">Sửa #{id}</span>
        </div>

        <h1 className="text-xl font-semibold mb-4">Sửa Topic</h1>

        <form onSubmit={submit} className="space-y-5 bg-white p-5 rounded-xl border">
          {err && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{err}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Tên topic <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              className="h-10 w-full rounded-lg border px-3 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Slug sẽ tự sinh: <span className="font-medium">{slug || "…"}</span></p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mô tả</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Thứ tự</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((s) => ({ ...s, sort_order: e.target.value }))}
                className="h-10 w-full rounded-lg border px-3 text-sm"
              />
            </div>
            <label className="flex items-end gap-2">
              <input
                type="checkbox"
                checked={form.status}
                onChange={(e) => setForm((s) => ({ ...s, status: e.target.checked }))}
              />
              <span className="text-sm">Hiển thị</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
            <button type="button" onClick={() => router.back()} className="rounded-lg border px-4 py-2">
              Huỷ
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
