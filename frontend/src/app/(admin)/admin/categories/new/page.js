"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const KEY = "admin_token";

/* ========= utils ========= */
const cx = (...xs) => xs.filter(Boolean).join(" ");
const toSlug = (str = "") =>
  String(str)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-");

async function api(path, { method = "GET", body } = {}) {
  const t = typeof window !== "undefined" ? localStorage.getItem(KEY) : "";
  const res = await fetch(`${BASE}${API}/categories${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j?.message || j?.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function uploadImageToStorage(file, folder = "categories") {
  const token = typeof window !== "undefined" ? localStorage.getItem(KEY) : "";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch(`${BASE}${API}/storage/upload`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const text = await res.text().catch(() => "");
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}

  if (!res.ok || !data?.success || !data?.url) {
    throw new Error(data?.message || "Upload ảnh thất bại.");
  }

  return data;
}

/* ========= UI primitives ========= */
const Label = ({ children, required }) => (
  <label className="block text-sm font-medium mb-1">
    {children} {required ? <span className="text-red-500">*</span> : null}
  </label>
);

const Help = ({ children }) => (
  <p className="text-xs text-gray-500 mt-1">{children}</p>
);

const Input = (p) => (
  <input
    {...p}
    className={cx(
      "h-10 w-full rounded-xl border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-gray-900/10 outline-none",
      p.className
    )}
  />
);

const Textarea = (p) => (
  <textarea
    {...p}
    className={cx(
      "min-h-[100px] w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900/10 outline-none",
      p.className
    )}
  />
);

const Select = (p) => (
  <select
    {...p}
    className={cx(
      "h-10 w-full rounded-xl border border-gray-300 px-3 text-sm bg-white focus:ring-2 focus:ring-gray-900/10 outline-none",
      p.className
    )}
  />
);

const Button = ({ variant = "primary", className, ...props }) => {
  const map = {
    primary: "bg-black text-white hover:opacity-90",
    secondary: "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-50 border border-transparent",
  };
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center gap-2 px-3.5 h-10 rounded-xl text-sm font-medium transition btn-soft",
        map[variant],
        props.disabled ? "opacity-70 cursor-not-allowed" : "",
        className
      )}
    />
  );
};

const Switch = ({ checked, onChange }) => (
  <button
    type="button"
    aria-pressed={checked}
    onClick={() => onChange(!checked)}
    className={cx(
      "relative inline-flex h-6 w-11 items-center rounded-full transition",
      checked ? "bg-green-600" : "bg-gray-300"
    )}
  >
    <span
      className={cx(
        "inline-block h-5 w-5 transform rounded-full bg-white transition",
        checked ? "translate-x-6" : "translate-x-1"
      )}
    />
  </button>
);

/* ======= helpers for tree ======= */
function flattenTreeToOptions(tree = [], level = 0, acc = []) {
  for (const n of tree) {
    acc.push({ id: n.id, name: `${"— ".repeat(level)}${n.name}`, slug: n.slug, raw: n });
    if (Array.isArray(n.children) && n.children.length) {
      flattenTreeToOptions(n.children, level + 1, acc);
    }
  }
  return acc;
}

/* ========= Page ========= */
export default function CategoryCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    parent_id: "",
    image: "",
    sort_order: 0,
    // status: Published/Hidden -> map 1/0
    status: 1,
  });
  const [tree, setTree] = useState([]);
  const [parents, setParents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [slugErr, setSlugErr] = useState("");
  const [imgErr, setImgErr] = useState("");
  const [uploadErr, setUploadErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("");
  const [touched, setTouched] = useState(false);

  const genSlug = useMemo(() => toSlug(form.name || ""), [form.name]);
  const finalSlug = form.slug?.trim() || genSlug;

  // keyboard shortcut: Ctrl/Cmd + S
  const submitBtnRef = useRef(null);
  const fileInputRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
      if (isSave) {
        e.preventDefault();
        submitBtnRef.current?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // load tree for parent select
  useEffect(() => {
    (async () => {
      try {
        const data = await api("/tree");
        setTree(data || []);
        setParents(flattenTreeToOptions(data || []));
      } catch {}
    })();
  }, []);

  // realtime validations
  useEffect(() => {
    // name required
    if (!form.name.trim()) {
      setErr("Tên danh mục bắt buộc.");
    } else {
      setErr("");
    }
  }, [form.name]);

  // slug unique check (best-effort): try GET /categories/by-slug/{slug}
  useEffect(() => {
    let stop = false;
    if (!finalSlug) { setSlugErr(""); return; }
    const timeout = setTimeout(async () => {
      try {
        await fetch(`${BASE}${API}/categories/by-slug/${encodeURIComponent(finalSlug)}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }).then(async (r) => {
          if (stop) return;
          if (r.ok) {
            // slug already exists
            setSlugErr("Slug đã tồn tại, vui lòng chọn slug khác.");
          } else {
            // 404 or non-ok -> coi như available
            setSlugErr("");
          }
        }).catch(() => { /* ignore */ });
      } catch { /* ignore */ }
    }, 350);
    return () => { stop = true; clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalSlug]);

  // image URL basic validation
  useEffect(() => {
    if (!form.image) { setImgErr(""); return; }
    const ok = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(form.image);
    setImgErr(ok ? "" : "URL ảnh không hợp lệ (hỗ trợ: png, jpg, jpeg, webp, gif, svg).");
  }, [form.image]);

  const urlPreview = useMemo(() => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin || "";
    const parentSlug = parents.find(p => String(p.id) === String(form.parent_id))?.slug;
    const path = parentSlug ? `/category/${parentSlug}/${finalSlug || "..."}` : `/category/${finalSlug || "..."}`;
    return `${origin}${path}`;
  }, [parents, form.parent_id, finalSlug]);

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (uploading) { return; }
    if (!form.name.trim()) { setErr("Tên danh mục bắt buộc."); return; }
    if (slugErr) { return; }
    if (imgErr) { return; }
    if (uploadErr) { return; }

    const payload = {
      name: form.name.trim(),
      slug: finalSlug || undefined,               // BE sẽ uniqueSlug nếu cần
      description: form.description || undefined,
      parent_id: form.parent_id ? Number(form.parent_id) : 0,
      image: form.image || undefined,
      sort_order: Number(form.sort_order) || 0,
      status: Number(form.status) === 1 ? 1 : 0,  // Published(1) / Hidden(0)
    };

    try {
      setSaving(true);
      await api("", { method: "POST", body: payload });
      router.push("/admin/categories?created=1");
    } catch (e) {
      setErr(e.message || "Có lỗi xảy ra khi tạo danh mục.");
    } finally {
      setSaving(false);
    }
  };

  const openFileDialog = () => {
    setUploadErr("");
    setImgErr("");
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) { return; }

    if (!file.type.startsWith("image/")) {
      setUploadErr("Vui lòng chọn tệp hình ảnh hợp lệ (png, jpg, webp…).");
      event.target.value = "";
      return;
    }

    setUploadErr("");
    setImgErr("");
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setUploading(true);

    try {
      const uploaded = await uploadImageToStorage(file);
      setForm((f) => ({ ...f, image: uploaded.url || "" }));
    } catch (error) {
      setUploadErr(error.message || "Upload ảnh thất bại.");
    } finally {
      setUploading(false);
      event.target.value = "";
      URL.revokeObjectURL(previewUrl);
      setPreview("");
    }
  };

  const clearImage = () => {
    setForm((f) => ({ ...f, image: "" }));
    setPreview("");
    setUploadErr("");
    setImgErr("");
  };

  return (
    <div className="p-6 max-w-4xl anim-fade-up">
      {/* Breadcrumbs */}
      <div className="text-sm text-gray-500 mb-2">
        <button onClick={() => router.push("/admin/categories")} className="hover:underline">Danh mục</button>
        <span className="mx-1">/</span>
        <span className="text-gray-800">Tạo mới</span>
      </div>

      {/* Sticky header actions for better UX */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 mb-4 bg-white/80 backdrop-blur border-b">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Tạo danh mục mới</h1>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>Huỷ</Button>
            <Button
              ref={submitBtnRef}
              onClick={submit}
              disabled={saving || uploading || !!err || !!slugErr || !!imgErr || !!uploadErr}
            >
              {saving ? "Đang tạo…" : "Tạo danh mục"}
            </Button>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cột 1-2: Thông tin chính */}
        <div className="md:col-span-2 space-y-5">
          {/* Error global */}
          {touched && err ? (
            <div className="rounded-xl bg-red-50 text-red-700 text-sm px-4 py-3">{err}</div>
          ) : null}

          {/* Tên danh mục */}
          <div>
            <Label required>Tên danh mục</Label>
            <Input
              required
              value={form.name}
              maxLength={150}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Bánh kem / Cookies / Bánh mì…"
              autoFocus
            />
            <Help>Tối đa 150 ký tự. Bắt buộc.</Help>
          </div>

          {/* Slug */}
          <div>
            <Label>Slug</Label>
            <div className="flex items-center gap-2">
              <Input
                value={form.slug}
                onChange={(e) => setForm(f => ({ ...f, slug: toSlug(e.target.value) }))}
                placeholder={genSlug || "slug-tu-dong"}
                aria-invalid={!!slugErr}
              />
              <Button
                type="button"
                variant="secondary"
                title="Đặt lại từ tên"
                onClick={() => setForm(f => ({ ...f, slug: genSlug }))}
              >
                Từ tên
              </Button>
            </div>
            <Help>
              Slug tự sinh từ tên nếu bạn bỏ trống. {finalSlug ? <>Đang dùng: <span className="font-medium">{finalSlug}</span></> : "—"}
            </Help>
            {slugErr ? <div className="text-xs text-red-600 mt-1">{slugErr}</div> : null}
          </div>

          {/* Mô tả ngắn */}
          <div>
            <Label>Mô tả ngắn</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả về danh mục này…"
            />
            <Help>Hỗ trợ plain text (có thể tích hợp Markdown/WYSIWYG sau).</Help>
          </div>

          {/* URL Preview */}
          <div className="rounded-xl border p-3 bg-white">
            <div className="text-xs text-gray-500">URL preview</div>
            <div className="text-sm font-mono break-all text-gray-800">{urlPreview || "—"}</div>
          </div>
        </div>

        {/* Cột 3: Thuộc tính phụ */}
        <div className="space-y-5">
          {/* Danh mục cha */}
          <div>
            <Label>Danh mục cha</Label>
            <Select
              value={form.parent_id ?? ""}
              onChange={(e) => setForm(f => ({ ...f, parent_id: e.target.value }))}
            >
              <option value="">— Không có —</option>
              {(parents || []).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
            <Help>Chọn để tạo danh mục con.</Help>
          </div>

          {/* Ảnh/Icon (URL + preview) */}
          <div>
            <Label>Ảnh/Icon (URL)</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  value={form.image}
                  onChange={(e) => {
                    setUploadErr("");
                    setPreview("");
                    setForm((f) => ({ ...f, image: e.target.value.trim() }));
                  }}
                  placeholder="https://cdn.example.com/cat.webp"
                  aria-invalid={!!imgErr}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={openFileDialog}
                  disabled={uploading}
                >
                  {uploading ? "Đang tải..." : "Chọn ảnh từ máy"}
                </Button>
                {(form.image || preview) ? (
                  <Button type="button" variant="ghost" onClick={clearImage} disabled={uploading}>
                    Xoá ảnh
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploadErr ? <div className="text-xs text-red-600">{uploadErr}</div> : null}
              {imgErr ? <div className="text-xs text-red-600">{imgErr}</div> : null}
              {(preview || form.image) ? (
                <div className="rounded-xl border bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview || form.image}
                    alt="Preview"
                    className="max-h-40 object-contain mx-auto"
                    onError={() => setImgErr("Không tải được ảnh, hãy kiểm tra URL.")}
                    onLoad={() => setImgErr("")}
                  />
                </div>
              ) : null}
            </div>
            <Help>
              Dán URL ảnh hợp lệ (jpg/png/webp/svg…) hoặc chọn ảnh trực tiếp từ thiết bị của bạn.
            </Help>
          </div>

          {/* Thứ tự sắp xếp */}
          <div>
            <Label>Thứ tự sắp xếp</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={form.sort_order}
              onChange={(e) => setForm(f => ({ ...f, sort_order: e.target.value }))}
              placeholder="0"
            />
            <Help>Số nguyên, mặc định 0. Nhỏ hơn → ưu tiên hiển thị trước.</Help>
          </div>

          {/* Trạng thái */}
          <div>
            <Label>Trạng thái</Label>
            <Select
              value={String(form.status)}
              onChange={(e) => setForm(f => ({ ...f, status: Number(e.target.value) }))}
            >
              <option value="1">Published (hiển thị)</option>
              <option value="0">Hidden (ẩn)</option>
            </Select>
            <Help>Ánh xạ BE: Published = 1, Hidden = 0.</Help>
          </div>

          {/* Hiển thị nhanh (menu/home/featured) – TODO (BE chưa có fields) */}
          <div className="rounded-xl border bg-orange-50/40 p-3">
            <div className="text-sm font-medium mb-2">Hiển thị (tùy chọn)</div>
            <div className="text-xs text-gray-600">
              Các cờ như “trang chủ”, “menu”, “featured” chưa có trường BE. Có thể bổ sung sau (TODO).
            </div>
          </div>
        </div>

        {/* Actions bottom (mobile) */}
        <div className="md:col-span-3 flex items-center gap-3 pt-2 sticky bottom-0 bg-white/80 backdrop-blur -mx-6 px-6 py-3 border-t">
          <Button
            type="submit"
            ref={submitBtnRef}
            disabled={saving || uploading || !!err || !!slugErr || !!imgErr || !!uploadErr}
          >
            {saving ? "Đang tạo…" : "Tạo danh mục"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>Huỷ</Button>
          <span className="text-xs text-gray-500">Mẹo: Nhấn <kbd className="px-1 border rounded">Ctrl/Cmd</kbd> + <kbd className="px-1 border rounded">S</kbd> để lưu nhanh.</span>
        </div>
      </form>
    </div>
  );
}
