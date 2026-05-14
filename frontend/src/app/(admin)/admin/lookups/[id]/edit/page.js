"use client";

import React, { useEffect, useMemo, useState } from "react";

/** ====== API constants ====== */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

/** ====== helpers ====== */
function getToken() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(KEY); } catch { return null; }
}

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-");
}

/** ====== tiny ui ====== */
const Label = ({ children }) => <label className="block text-sm font-medium mb-1">{children}</label>;
const TextInput = ({ className = "", ...rest }) => (
  <input
    {...rest}
    className={
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 " +
      className
    }
  />
);
const TextArea = ({ className = "", ...rest }) => (
  <textarea
    rows={4}
    {...rest}
    className={
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 " +
      className
    }
  />
);
const Radio = ({ name, value, checked, onChange, label }) => (
  <label className="flex items-center gap-2 text-sm">
    <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="h-4 w-4 text-rose-500 focus:ring-rose-400" />
    {label}
  </label>
);
const Check = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2 text-sm">
    <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-400" />
    {label}
  </label>
);

function PillsInput({ value, onChange, placeholder }) {
  const [text, setText] = useState("");
  const add = (t) => {
    const v = t.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setText("");
  };
  return (
    <div className="rounded-md border border-gray-300 bg-white px-2 py-1">
      <div className="mb-1 flex flex-wrap gap-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="text-gray-500 hover:text-rose-600">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(text); }
          }}
          placeholder={placeholder}
          className="flex-1 border-0 px-1 py-1 text-sm outline-none"
        />
        <button type="button" onClick={() => add(text)} className="rounded-md border px-2 text-xs">Thêm</button>
      </div>
      <div className="text-xs text-gray-400 px-1 pb-1">Nhấn Enter hoặc dấu phẩy để thêm</div>
    </div>
  );
}

function FilePicker({ label, multiple = false, onChange, existing = [] }) {
  const [previews, setPreviews] = useState([]);
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          onChange(files);
          setPreviews(files.map((f) => URL.createObjectURL(f)));
        }}
        className="text-sm"
      />
      {(previews.length > 0 || existing.length > 0) && (
        <div className="mt-2 flex gap-3 flex-wrap">
          {previews.slice(0, 3).map((src, i) => (
            <img key={"p"+i} src={src} alt="" className="h-20 w-20 rounded-md object-cover ring-1 ring-gray-200" />
          ))}
          {previews.length === 0 &&
            existing.slice(0, 3).map((src, i) => (
              <img key={"e"+i} src={src} alt="" className="h-20 w-20 rounded-md object-cover ring-1 ring-gray-200" />
            ))}
        </div>
      )}
    </div>
  );
}

/** ====== page ====== */
export default function EditProductPage({ params }) {
  const id = params?.id;

  // form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(false); // khi sửa, mặc định tắt (giữ slug cũ)
  const [summary, setSummary] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");       // map -> price_sale (update)
  const [compareAt, setCompareAt] = useState(""); // map -> price_buy (update)
  const [quantity, setQuantity] = useState("");

  const [sku, setSku] = useState("");
  const [flavors, setFlavors] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [weightGram, setWeightGram] = useState("");
  const [bestBeforeDays, setBestBeforeDays] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [channelsSelected, setChannelsSelected] = useState([]); // pickup|delivery
  const [nutrition, setNutrition] = useState({
    vegan: false,
    glutenFree: false,
    containsNuts: false,
    containsDairy: false,
  });
  const [tags, setTags] = useState([]);
  const [status, setStatus] = useState(1);

  // images preview current
  const [thumbUrl, setThumbUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState([]);

  // files
  const [thumbnail, setThumbnail] = useState([]);
  const [image, setImage] = useState([]);
  const [gallery, setGallery] = useState([]);

  // lookups
  const [categories, setCategories] = useState([]);
  const [channels] = useState(["pickup", "delivery"]);

  // ui
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [okMsg, setOkMsg] = useState("");

  // load categories (public, no auth)
  useEffect(() => {
    fetch(`${BASE}${API}/categories`, { headers: { Accept: "application/json" } })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
        setCategories(list);
      })
      .catch(() => setCategories([]));
  }, []);

  // load product detail
  useEffect(() => {
    let aborted = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`${BASE}${API}/products/${encodeURIComponent(id)}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d?.message || "Load thất bại");
        if (aborted) return;

        // core
        setName(d?.name || "");
        setSlug(d?.slug || "");
        setSummary(d?.description || "");
        setContentHtml(d?.content_html || "");
        setCategoryId(d?.category_id ? String(d.category_id) : "");
        setPrice(d?.price_sale ?? d?.price_buy ?? "");
        setCompareAt(d?.price_buy ?? "");
        setQuantity(d?.quantity ?? "");

        // meta (backend đã alias)
        setSku(d?.sku || "");
        setFlavors(Array.isArray(d?.meta?.flavors) ? d.meta.flavors : []);
        setIngredients(Array.isArray(d?.meta?.ingredients) ? d.meta.ingredients : []);
        setWeightGram(d?.weight_gram ?? d?.meta?.weightGram ?? "");
        setBestBeforeDays(d?.best_before_days ?? d?.meta?.bestBeforeDays ?? "");
        setAvailableFrom(d?.available_from ?? d?.meta?.availableFrom ?? "");
        setChannelsSelected(Array.isArray(d?.channels) ? d.channels : []);
        const nut = d?.nutrition || d?.meta?.nutrition || {};
        setNutrition({
          vegan: !!nut.vegan,
          glutenFree: !!nut.glutenFree,
          containsNuts: !!(nut.containsNuts || nut.nuts),
          containsDairy: !!(nut.containsDairy || nut.dairy),
        });
        setTags(Array.isArray(d?.tags) ? d.tags : d?.meta?.tags || []);
        setStatus(typeof d?.status === "number" ? d.status : 1);

        // images
        setThumbUrl(d?.thumbnail || "");
        setImageUrl(d?.image || "");
        const g = Array.isArray(d?.images) ? d.images.map(it => it.image) : [];
        setGalleryUrls(g);
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [id]);

  // auto slug if enabled
  useEffect(() => {
    if (!autoSlug) return;
    setSlug(slugify(name));
  }, [name, autoSlug]);

  const canSubmit = useMemo(() =>
    name.trim() !== "" && categoryId && price !== "" && Number(price) >= 0,
  [name, categoryId, price]);

  const toggleChannel = (c) => {
    setChannelsSelected((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOkMsg("");
    try {
      const fd = new FormData();
      // core
      if (name) fd.append("name", name);
      if (slug) fd.append("slug", slug);
      if (categoryId) fd.append("category_id", String(categoryId));
      if (quantity !== "") fd.append("quantity", quantity);
      // update dùng price_buy / price_sale
      if (compareAt !== "") fd.append("price_buy", compareAt);
      if (price !== "") fd.append("price_sale", price);
      fd.append("status", String(status));
      fd.append("description", summary || "");
      fd.append("content", contentHtml || "");

      // meta
      sku && fd.append("sku", sku);
      flavors.forEach((f, i) => fd.append(`flavors[${i}]`, f));
      ingredients.forEach((it, i) => fd.append(`ingredients[${i}]`, it));
      tags.forEach((t, i) => fd.append(`tags[${i}]`, t));
      if (availableFrom) fd.append("availableFrom", availableFrom);
      if (weightGram) fd.append("weightGram", weightGram);
      if (bestBeforeDays) fd.append("bestBeforeDays", bestBeforeDays);
      channelsSelected.forEach((c, i) => fd.append(`channels[${i}]`, c));
      fd.append("nutrition[vegan]", nutrition.vegan ? 1 : 0);
      fd.append("nutrition[glutenFree]", nutrition.glutenFree ? 1 : 0);
      fd.append("nutrition[containsNuts]", nutrition.containsNuts ? 1 : 0);
      fd.append("nutrition[containsDairy]", nutrition.containsDairy ? 1 : 0);

      // files
      if (thumbnail[0]) fd.append("thumbnail_file", thumbnail[0]);
      if (image[0]) fd.append("image_file", image[0]);
      gallery.forEach((g) => fd.append("gallery_files[]", g));

      const token = getToken();
      const res = await fetch(`${BASE}${API}/products/${encodeURIComponent(id)}`, {
        method: "POST", // Laravel route dùng match put|patch, nhưng thường cho phép POST + _method
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/json",
        },
        body: (() => {
          const form = new FormData();
          form.append("_method", "PATCH"); // gửi PATCH qua form-data
          for (const [k, v] of fd.entries()) form.append(k, v);
          return form;
        })(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || (data?.errors ? JSON.stringify(data.errors) : "Update failed"));

      setOkMsg("Cập nhật sản phẩm thành công!");
    } catch (e2) {
      setErr(String(e2.message || e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-rose-50 py-10">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-rose-100">
        <div className="mb-6 text-lg font-semibold">
          Sửa sản phẩm — <span className="text-gray-500">Giữ cơ chế SALE: giá gốc (price_buy) & giá bán (price_sale)</span>
        </div>

        {loading ? (
          <div className="text-sm text-gray-600">Đang tải dữ liệu…</div>
        ) : (
          <form onSubmit={submit} className="grid grid-cols-1 gap-6">
            {/* row 0: ảnh hiện tại */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {thumbUrl && (
                <div>
                  <Label>Thumbnail hiện tại</Label>
                  <img src={thumbUrl} className="h-24 w-24 rounded-md object-cover ring-1 ring-gray-200" alt="" />
                </div>
              )}
              {imageUrl && (
                <div>
                  <Label>Ảnh chính hiện tại</Label>
                  <img src={imageUrl} className="h-24 w-24 rounded-md object-cover ring-1 ring-gray-200" alt="" />
                </div>
              )}
              {galleryUrls?.length > 0 && (
                <div>
                  <Label>Gallery hiện tại</Label>
                  <div className="flex gap-2 flex-wrap">
                    {galleryUrls.slice(0, 4).map((u, i) => (
                      <img key={i} src={u} className="h-16 w-16 rounded-md object-cover ring-1 ring-gray-200" alt="" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* row 1: tên & slug */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <Label>Tên sản phẩm</Label>
                <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Bánh kem dâu tây 6 inch" />
                <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" checked={autoSlug} onChange={(e) => setAutoSlug(e.target.checked)} />
                  Tự động tạo slug từ tên
                </label>
              </div>
              <div>
                <Label>Slug</Label>
                <TextInput
                  value={slug}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSlug(v);
                    if (v !== slugify(name)) setAutoSlug(false);
                  }}
                  placeholder="banh-kem-dau-tay-6-inch"
                />
              </div>
            </div>

            {/* row 2: danh mục + giá/tồn */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <Label>Danh mục</Label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Giá bán (price_sale)</Label>
                  <TextInput type="number" min="0" step="1000" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="350000" />
                </div>
                <div>
                  <Label>Giá gốc (price_buy)</Label>
                  <TextInput type="number" min="0" step="1000" value={compareAt} onChange={(e) => setCompareAt(e.target.value)} placeholder="400000" />
                </div>
              </div>
            </div>

            {/* row 2.5: tồn kho */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Tồn kho</Label>
                <TextInput type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="26" />
              </div>
            </div>

            {/* row 3: flavors, ingredients */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <Label>Hương vị</Label>
                <PillsInput value={flavors} onChange={setFlavors} placeholder="VD: Dâu, Vani, Socola, Matcha…" />
              </div>
              <div>
                <Label>Thành phần</Label>
                <PillsInput value={ingredients} onChange={setIngredients} placeholder="VD: Sốt mứt, trứng, sữa, bột, dâu tây…" />
              </div>
            </div>

            {/* row 4: trọng lượng, HSD, availableFrom */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <Label>Khối lượng (gram)</Label>
                <TextInput type="number" min="0" value={weightGram} onChange={(e) => setWeightGram(e.target.value)} placeholder="VD: 500" />
              </div>
              <div>
                <Label>HSD / dùng ngon trong (ngày)</Label>
                <TextInput type="number" min="0" value={bestBeforeDays} onChange={(e) => setBestBeforeDays(e.target.value)} placeholder="VD: 3" />
              </div>
              <div>
                <Label>Bán từ ngày</Label>
                <TextInput type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
              </div>
            </div>

            {/* row 5: SKU, channels, status */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <Label>SKU</Label>
                <TextInput value={sku} onChange={(e) => setSku(e.target.value)} placeholder="VD: CAKE-STR-6IN" />
              </div>
              <div>
                <Label>Kênh nhận hàng</Label>
                <div className="flex flex-wrap gap-4 mt-1">
                  {channels.map((c) => (
                    <Check
                      key={c}
                      checked={channelsSelected.includes(c)}
                      onChange={() => toggleChannel(c)}
                      label={c === "pickup" ? "Pickup" : "Delivery"}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>Trạng thái hiển thị</Label>
                <div className="flex items-center gap-6 mt-1">
                  <Radio name="status" value={0} checked={status === 0} onChange={() => setStatus(0)} label="Bản nháp" />
                  <Radio name="status" value={1} checked={status === 1} onChange={() => setStatus(1)} label="Đăng ngay" />
                </div>
              </div>
            </div>

            {/* row 6: tags */}
            <div>
              <Label>Thẻ (tags)</Label>
              <PillsInput value={tags} onChange={setTags} placeholder="VD: Sinh nhật, Không trứng, Trà chiều…" />
            </div>

            {/* row 7: descriptions */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <Label>Mô tả ngắn</Label>
                <TextArea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Mô tả hương vị, kết cấu, gợi ý thưởng thức…" />
              </div>
              <div>
                <Label>Mô tả chi tiết (HTML / rich text)</Label>
                <TextArea rows={6} value={contentHtml} onChange={(e) => setContentHtml(e.target.value)} placeholder="<p>…</p>" />
                <p className="mt-1 text-xs text-gray-500">
                  Trường này lưu vào <code>content.html</code>; các ô ở trên lưu vào <code>content.meta</code>.
                </p>
              </div>
            </div>

            {/* images */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <FilePicker label="Thay Thumbnail" multiple={false} onChange={setThumbnail} existing={thumbUrl ? [thumbUrl] : []} />
              <FilePicker label="Thay Ảnh chính" multiple={false} onChange={setImage} existing={imageUrl ? [imageUrl] : []} />
              <FilePicker label="Thêm ảnh vào Gallery" multiple onChange={setGallery} existing={galleryUrls} />
            </div>

            {/* footer */}
            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => history.back()} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                Hủy
              </button>
              <button disabled={!canSubmit || busy} className="rounded-md bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60">
                {busy ? "Đang lưu…" : "Lưu thay đổi"}
              </button>
            </div>

            {err && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">Lỗi: {err}</div>}
            {okMsg && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{okMsg}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
