"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

/* ====== ReactQuill (client only) ====== */
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

/** ====== API constants (gọi thẳng BE, đã bật CORS) ====== */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const KEY = "admin_token";

/** ====== helpers ====== */
function getToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
function genSKUFromName(name) {
  const head = (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map((w) => (w[0] ? w[0].toUpperCase() : ""))
    .join("");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return (head || "SKU") + "-" + rand;
}

/** ====== tiny ui ====== */
const Label = ({ children }) => (
  <label className="block text-sm font-medium mb-1">{children}</label>
);
const TextInput = ({ className = "", ...rest }) => (
  <input
    {...rest}
    className={
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-colors " +
      className
    }
  />
);
const TextArea = ({ className = "", ...rest }) => (
  <textarea
    rows={4}
    {...rest}
    className={
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-colors " +
      className
    }
  />
);
const Radio = ({ name, value, checked, onChange, label }) => (
  <label className="flex items-center gap-2 text-sm">
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 text-rose-500 focus:ring-rose-400"
    />
    {label}
  </label>
);
const Check = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-400"
    />
    {label}
  </label>
);

/* ====== Autocomplete Pills ====== */
function AutocompletePillsInput({ value, onChange, placeholder, suggests = [], label, className = "" }) {
  const [inputText, setInputText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFiltered] = useState([]);
  const [hi, setHi] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!inputText.trim()) {
      setFiltered([]);
      setShowSuggestions(false);
      return;
    }
    const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const t = norm(inputText);
    const filtered = suggests.filter((s) => norm(s).includes(t)).slice(0, 8);
    setFiltered(filtered);
    setShowSuggestions(filtered.length > 0);
    setHi(-1);
  }, [inputText, suggests]);

  const add = (s) => {
    const v = s.trim();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
    setInputText("");
    setShowSuggestions(false);
    setHi(-1);
  };
  const remove = (s) => onChange(value.filter((x) => x !== s));

  const onKey = (e) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHi((p) => (p < filteredSuggestions.length - 1 ? p + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHi((p) => (p > 0 ? p - 1 : filteredSuggestions.length - 1));
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        setHi(-1);
        return;
      }
    }
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      if (hi >= 0 && filteredSuggestions[hi]) add(filteredSuggestions[hi]);
      else add(inputText);
    }
  };

  useEffect(() => {
    const clickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setHi(-1);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <Label>{label}</Label>
      <div className="rounded-md border border-gray-300 bg-white p-2 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100 transition-all">
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 px-2 py-1 text-xs border border-rose-200"
            >
              {t}
              <button
                type="button"
                onClick={() => remove(t)}
                className="ml-1 text-rose-500 hover:text-rose-700 hover:bg-rose-200 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="relative flex items-center gap-2">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={onKey}
            onFocus={() => {
              if (inputText.trim() && filteredSuggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder={placeholder}
            className="flex-1 border-0 p-1 text-sm outline-none bg-transparent"
            autoComplete="off"
          />
          {inputText.trim() && (
            <button
              type="button"
              onClick={() => add(inputText)}
              className="rounded-md border border-gray-300 px-3 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-600"
            >
              Thêm
            </button>
          )}
        </div>

        {showSuggestions && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-auto">
            {filteredSuggestions.map((s, i) => (
              <div
                key={s}
                onClick={() => add(s)}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-rose-50 ${
                  i === hi ? "bg-rose-100" : ""
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-400 mt-2">
          Gõ để tìm gợi ý, dùng ↑↓ để di chuyển, Enter/Tab/"," để thêm
        </div>
      </div>
    </div>
  );
}

/* ====== File Picker ====== */
function FilePicker({ label, multiple = false, onChange }) {
  const [previews, setPreviews] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) {
      onChange(multiple ? files : [files[0]]);
      setPreviews(files.slice(0, multiple ? 10 : 1).map((f) => URL.createObjectURL(f)));
    }
  };

  return (
    <div className="relative">
      <Label>{label}</Label>
      <div
        className={`border-2 border-dashed rounded-md p-4 text-center transition-colors cursor-pointer ${
          dragActive ? "border-rose-400 bg-rose-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={(e) => {
            const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
            if (files.length) {
              onChange(multiple ? files : [files[0]]);
              setPreviews(files.slice(0, multiple ? 10 : 1).map((f) => URL.createObjectURL(f)));
            }
          }}
          className="hidden"
        />
        <p className="text-sm text-gray-500 mb-2">Kéo thả hoặc click để chọn ảnh</p>
        {dragActive && <p className="text-rose-600 text-sm">Thả ảnh vào đây...</p>}
      </div>

      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt="" className="h-20 w-full rounded-md object-cover border" />
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(src);
                  setPreviews((prev) => prev.filter((_, idx) => idx !== i));
                }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** ====== PAGE ====== */
export default function NewProductPage() {
  const router = useRouter();
  const newVariant = (order = 0, overrides = {}) => ({
    tempId: Math.random().toString(16).slice(2),
    name: "",
    weightGram: "",
    price: "",
    sortOrder: order,
    isDefault: order === 0,
    ...overrides,
  });
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);
  const [summary, setSummary] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [sku, setSku] = useState("");
  const [flavors, setFlavors] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [bestBeforeDays, setBestBeforeDays] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [channelsSelected, setChannelsSelected] = useState([]);
  const [nutrition, setNutrition] = useState({
    vegan: false,
    glutenFree: false,
    containsNuts: false,
    containsDairy: false,
  });
  const [tags, setTags] = useState([]);
  const [status, setStatus] = useState(1);
  const [productNew, setProductNew] = useState(false);
  const [thumbnail, setThumbnail] = useState([]);
  const [image, setImage] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tagSuggests, setTagSuggests] = useState([]);
  const [channels, setChannels] = useState([]);
  const [ingredientsSuggests, setIngredientsSuggests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [okMsg, setOkMsg] = useState("");
  const [useVariants, setUseVariants] = useState(false);
  const [variants, setVariants] = useState([newVariant(0, { isDefault: true })]);

  const addVariantRow = () => {
    setVariants((prev) => [...prev, newVariant(prev.length, { isDefault: prev.length === 0 })]);
  };

  const updateVariantField = (index, field, value) => {
    setVariants((prev) =>
      prev.map((variant, idx) => {
        if (idx !== index) return variant;
        const next = { ...variant, [field]: value };
        if (field === "weightGram") {
          const trimmed = String(value || "").trim();
          next.name = trimmed ? `${trimmed}g` : "";
        }
        return next;
      })
    );
  };

  const removeVariantRow = (index) => {
    setVariants((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, idx) => idx !== index).map((variant, idx2) => ({ ...variant, sortOrder: idx2 }));
      if (!next.some((variant) => variant.isDefault)) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
  };

  const markDefaultVariant = (index) => {
    setVariants((prev) => prev.map((variant, idx) => ({ ...variant, isDefault: idx === index })));
  };

  const handleToggleVariants = (checked) => {
    setUseVariants(checked);
    if (checked && variants.length === 0) {
      setVariants([newVariant(0, { isDefault: true })]);
    }
  };

  // Load categories
  useEffect(() => {
    fetch(`${BASE}${API}/categories`, { headers: { Accept: "application/json" } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setCategories(Array.isArray(data?.data) ? data.data : data);
      })
      .catch(() => setCategories([]));
  }, []);

  // Load lookups (tagSuggests, channels, allergens)
  useEffect(() => {
    fetch(`${BASE}${API}/lookups?format=simple`, { 
      headers: { Accept: "application/json" },
      cache: "no-store"
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        
        // Set tagSuggests (format=simple trả về array strings)
        if (Array.isArray(data?.tagSuggests)) {
          setTagSuggests(data.tagSuggests);
        }
        
        // Set channels
        if (Array.isArray(data?.channels)) {
          setChannels(data.channels);
        } else {
          // Fallback nếu không có trong API
          setChannels(["pickup", "delivery"]);
        }
        
        // Set ingredients suggests từ allergens hoặc dùng tagSuggests
        if (Array.isArray(data?.allergens) && data.allergens.length > 0) {
          const ingNames = data.allergens.map(a => a?.name || String(a)).filter(Boolean);
          setIngredientsSuggests(ingNames);
        } else if (Array.isArray(data?.tagSuggests)) {
          // Fallback: dùng một số tagSuggests phù hợp cho ingredients
          const commonIngredients = ["bột mì", "trứng", "sữa", "bơ", "đường", "dâu tây", "socola", "kem tươi", "hạnh nhân"];
          const tags = data.tagSuggests.map(t => typeof t === 'string' ? t : (t?.tag || t?.name || String(t)));
          setIngredientsSuggests([...commonIngredients, ...tags].slice(0, 20));
        } else {
          // Fallback cuối cùng
          setIngredientsSuggests(["bột mì", "trứng", "sữa", "bơ", "đường", "dâu tây", "socola"]);
        }
      })
      .catch(() => {
        // Fallback nếu API lỗi
        setTagSuggests(["Sinh nhật", "Cưới", "Trà chiều"]);
        setChannels(["pickup", "delivery"]);
        setIngredientsSuggests(["bột mì", "trứng", "sữa", "bơ", "đường", "dâu tây", "socola"]);
      });
  }, []);

  useEffect(() => {
    if (!autoSlug || !name.trim()) return;
    const s = slugify(name);
    if (s !== slug) setSlug(s);
  }, [name, autoSlug, slug]);

  useEffect(() => {
    if (!useVariants) return;
    const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
    if (!defaultVariant) return;
    if (defaultVariant.price !== "" && defaultVariant.price !== price) {
      setPrice(defaultVariant.price);
    }
  }, [useVariants, variants, price]);

  useEffect(() => {
    if (!sku.trim() && name.trim()) setSku(genSKUFromName(name));
  }, [name]);

  const canSubmit = useMemo(
    () => name.trim() !== "" && categoryId && price !== "" && Number(price) >= 0,
    [name, categoryId, price]
  );

  const toggleChannel = (channel) => {
    setChannelsSelected((prev) => {
      if (prev.includes(channel)) {
        return prev.filter((c) => c !== channel);
      } else {
        return [...prev, channel];
      }
    });
  };

  const quillModules = {
    toolbar: [[{ header: [1, 2, 3, false] }], ["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["link"], ["clean"]],
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOkMsg("");
    try {
      const fd = new FormData();
      const defaultVariantForSubmit = useVariants ? (variants.find((variant) => variant.isDefault) ?? variants[0]) : null;
      const priceFormValue = useVariants ? (defaultVariantForSubmit?.price ?? price) : price;
      fd.append("name", name);
      if (slug) fd.append("slug", slug);
      fd.append("category_id", String(categoryId));

      // Send price_buy directly
      if (priceFormValue !== "") fd.append("price_buy", priceFormValue);

      // Bỏ quantity - tồn kho được quản lý qua trang Stocks
      fd.append("status", String(status));
      fd.append("product_new", productNew ? "1" : "0");
      if (summary) fd.append("description", summary);
      if (contentHtml) fd.append("content", contentHtml);

      const finalSKU = sku && sku.trim() ? sku.trim() : genSKUFromName(name);
      fd.append("sku", finalSKU);
      setSku(finalSKU);

      flavors.forEach((f, i) => fd.append(`flavors[${i}]`, f));
      ingredients.forEach((it, i) => fd.append(`ingredients[${i}]`, it));
      tags.forEach((t, i) => fd.append(`tags[${i}]`, t));
      if (availableFrom) fd.append("availableFrom", availableFrom);
      if (bestBeforeDays) fd.append("bestBeforeDays", String(bestBeforeDays));
      channelsSelected.forEach((c, i) => fd.append(`channels[${i}]`, c));

      fd.append("nutrition[vegan]", nutrition.vegan ? "1" : "0");
      fd.append("nutrition[glutenFree]", nutrition.glutenFree ? "1" : "0");
      fd.append("nutrition[containsNuts]", nutrition.containsNuts ? "1" : "0");
      fd.append("nutrition[containsDairy]", nutrition.containsDairy ? "1" : "0");

      if (thumbnail[0]) fd.append("thumbnail_file", thumbnail[0]);
      if (image[0]) fd.append("image_file", image[0]);
      gallery.forEach((g) => fd.append("gallery_files[]", g));

      if (useVariants) {
        const cleanedVariants = variants
          .map((variant, idx) => ({
            name: (variant.name || "").trim(),
            weightGram: (variant.weightGram || "").trim(),
            price: variant.price,
            isDefault: variant.isDefault,
            sortOrder: variant.sortOrder ?? idx,
          }))
          .filter((variant) =>
            variant.weightGram !== "" &&
            variant.price !== "" &&
            !Number.isNaN(Number(variant.price))
          );

        if (!cleanedVariants.length) {
          throw new Error("Vui lòng thêm ít nhất 1 khối lượng với giá hợp lệ.");
        }

        cleanedVariants.forEach((variant, idx) => {
          const weightLabel = `${variant.weightGram}g`;
          fd.append(`variants[${idx}][name]`, weightLabel);
          fd.append(`variants[${idx}][weight_gram]`, String(variant.weightGram));
          fd.append(`variants[${idx}][price]`, String(variant.price));
          fd.append(`variants[${idx}][is_default]`, variant.isDefault ? "1" : "0");
          fd.append(`variants[${idx}][sort_order]`, String(variant.sortOrder ?? idx));
        });
      }

      const token = getToken();
      const res = await fetch(`${BASE}${API}/products`, {
        method: "POST",
        body: fd,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), Accept: "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("API Error:", data);
        const errorMsg = data?.message || data?.errors ? JSON.stringify(data) : "Submit failed";
        throw new Error(errorMsg);
      }

      router.replace("/admin/products");
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-rose-50 py-10">
      <div className="mx-auto max-w-6xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-rose-100">
        <h1 className="mb-6 text-2xl font-semibold text-gray-800">
          Tạo sản phẩm mới
          <span className="ml-2 inline-block text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            Tiệm bánh
          </span>
        </h1>

      

        <form onSubmit={submit} className="space-y-6">
          {/* Name & Slug */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label>Tên sản phẩm *</Label>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bánh kem dâu tây 6 inch tươi ngon"
                className="text-base"
              />
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoSlug}
                  onChange={(e) => setAutoSlug(e.target.checked)}
                  className="rounded"
                />
                Tự động tạo slug từ tên
              </label>
            </div>
            <div>
              <Label>Slug</Label>
              <TextInput
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  if (e.target.value !== slugify(name)) setAutoSlug(false);
                }}
                placeholder="banh-kem-dau-tay-6-inch"
              />
              {typeof window !== "undefined" && (
                <p className="mt-1 text-xs text-gray-500">
                  URL: {window.location.origin}/{slug || "slug"}/
                </p>
              )}
            </div>
          </div>

          {/* Category & Pricing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label>Danh mục *</Label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                required
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Giá gốc (VND) *</Label>
                <TextInput
                  type="number"
                  min="0"
                  step="1000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="350000"
                  required={!useVariants}
                  disabled={useVariants}
                />
                {useVariants && (
                  <p className="text-xs text-rose-500 mt-1">Giá sẽ tự động lấy theo size mặc định.</p>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">💡 Ghi chú:</span> Tồn kho được quản lý qua trang{" "}
                  <a 
                    href="/admin/stocks" 
                    className="underline hover:text-amber-600"
                    target="_blank"
                  >
                    Nhập kho (Stocks)
                  </a>
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-rose-100 bg-rose-50/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-rose-700">Bảng giá theo size / khối lượng</p>
                <p className="text-xs text-rose-500">Thêm nhiều lựa chọn size, gram với giá khác nhau. Size mặc định sẽ hiển thị trước.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-rose-700">
                <input
                  type="checkbox"
                  checked={useVariants}
                  onChange={(e) => handleToggleVariants(e.target.checked)}
                  className="h-4 w-4 rounded border-rose-400 text-rose-500 focus:ring-rose-400"
                />
                Bật bảng giá đa kích cỡ
              </label>
            </div>
            {useVariants && (
              <div className="mt-4 space-y-3">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-rose-100 text-xs sm:text-sm">
                    <thead className="bg-white/80 text-rose-600">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold">Khối lượng (g)</th>
                        <th className="px-2 py-2 text-left font-semibold">Giá (VND)</th>
                        <th className="px-2 py-2 text-center font-semibold">Mặc định</th>
                        <th className="px-2 py-2 text-left font-semibold">Thứ tự</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-50 bg-white">
                      {variants.map((variant, idx) => (
                        <tr key={variant.tempId ?? idx}>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              value={variant.weightGram}
                              onChange={(e) => updateVariantField(idx, "weightGram", e.target.value)}
                              className="w-full rounded border border-rose-200 px-2 py-1 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-200"
                              placeholder="500"
                              required
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={variant.price}
                              onChange={(e) => updateVariantField(idx, "price", e.target.value)}
                              className="w-full rounded border border-rose-200 px-2 py-1 text-sm focus:border-rose-400 focus:ring-1 focus:ring-rose-200"
                              placeholder="350000"
                              required
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="radio"
                              name="variant-default"
                              checked={variant.isDefault}
                              onChange={() => markDefaultVariant(idx)}
                              className="text-rose-500 focus:ring-rose-400"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              value={variant.sortOrder}
                              onChange={(e) => updateVariantField(idx, "sortOrder", e.target.value)}
                              className="w-full rounded border border-rose-200 px-2 py-1 text-sm focus:border-rose-400 focus:ring-1 focus:ring-rose-200"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeVariantRow(idx)}
                              className="text-xs text-red-500 hover:text-red-700 disabled:text-red-300"
                              disabled={variants.length <= 1}
                            >
                              Xoá
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addVariantRow}
                  className="inline-flex items-center gap-2 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100"
                >
                  + Thêm khối lượng
                </button>
              </div>
            )}
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label>Mô tả ngắn</Label>
              <TextArea
                rows={6}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Mô tả hương vị, kích cỡ, gợi ý thưởng thức…"
              />
              <p className="text-xs text-gray-500 mt-1">* Dùng cho listing, SEO meta. ~160 ký tự.</p>
            </div>
            <div>
              <Label>Mô tả chi tiết</Label>
              <div className="border rounded-md">
                <ReactQuill
                  theme="snow"
                  value={contentHtml}
                  onChange={setContentHtml}
                  className="bg-white"
                  modules={quillModules}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">* Có thể chèn chữ đậm, danh sách, liên kết…</p>
            </div>
          </div>

          {/* Flavors & Ingredients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AutocompletePillsInput
              value={flavors}
              onChange={setFlavors}
              suggests={tagSuggests}
              placeholder="Gõ hương vị: dâu, socola, matcha..."
              label="Hương vị"
            />
            <AutocompletePillsInput
              value={ingredients}
              onChange={setIngredients}
              suggests={ingredientsSuggests}
              placeholder="Gõ thành phần: bột, trứng, kem tươi..."
              label="Thành phần chính"
            />
          </div>

          {/* Tags */}
          <AutocompletePillsInput
            value={tags}
            onChange={setTags}
            suggests={tagSuggests}
            placeholder="Gõ thẻ: sinh nhật, vegan, không gluten..."
            label="Thẻ tag (tìm kiếm)"
            className="lg:col-span-2"
          />

          {/* File uploads */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FilePicker label="Ảnh thumbnail (220x220px khuyến nghị)" multiple={false} onChange={setThumbnail} />
            <FilePicker label="Ảnh chính (800x600px khuyến nghị)" multiple={false} onChange={setImage} />
            <FilePicker label="Ảnh gallery" multiple onChange={setGallery} />
          </div>

          {/* Channels, SKU, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label>SKU</Label>
              <div className="flex gap-2">
                <TextInput value={sku} onChange={(e) => setSku(e.target.value)} placeholder="VD: CAKE-STR-6IN" />
                <button
                  type="button"
                  onClick={() => setSku(genSKUFromName(name || "SP"))}
                  className="whitespace-nowrap px-3 rounded-md border text-sm hover:bg-gray-50"
                  title="Tạo tự động từ tên"
                >
                  Tạo SKU
                </button>
              </div>
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
              <Label>Trạng thái</Label>
              <div className="flex items-center gap-6 mt-1">
                <Radio name="status" value={0} checked={status === 0} onChange={() => setStatus(0)} label="Bản nháp" />
                <Radio name="status" value={1} checked={status === 1} onChange={() => setStatus(1)} label="Đăng ngay" />
              </div>
            </div>
            <div>
              <Label>Tùy chọn</Label>
              <div className="flex flex-col gap-2 mt-1">
                <Check checked={productNew} onChange={(e) => setProductNew(e.target.checked)} label="Sản phẩm mới (hiển thị ở trang chủ)" />
              </div>
            </div>
          </div>

          {/* Extra meta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label>HSD / dùng ngon trong (ngày)</Label>
              <TextInput type="number" min="0" value={bestBeforeDays} onChange={(e) => setBestBeforeDays(e.target.value)} placeholder="3" />
            </div>
            <div>
              <Label>Bán từ ngày</Label>
              <TextInput type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
            </div>
          </div>

          {/* Nutrition */}
          <div>
            <Label>Nhãn dinh dưỡng/thuộc tính</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
              <Check checked={nutrition.vegan} onChange={(e) => setNutrition((x) => ({ ...x, vegan: e.target.checked }))} label="Thuần chay (Vegan)" />
              <Check checked={nutrition.glutenFree} onChange={(e) => setNutrition((x) => ({ ...x, glutenFree: e.target.checked }))} label="Không gluten" />
              <Check checked={nutrition.containsNuts} onChange={(e) => setNutrition((x) => ({ ...x, containsNuts: e.target.checked }))} label="Có hạt" />
              <Check checked={nutrition.containsDairy} onChange={(e) => setNutrition((x) => ({ ...x, containsDairy: e.target.checked }))} label="Có sữa" />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => history.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!canSubmit || busy}
              className="px-6 py-2 text-sm font-medium text-white bg-rose-500 rounded-md hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {busy ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Đang tạo...
                </>
              ) : (
                "Tạo sản phẩm"
              )}
            </button>
          </div>

          {err && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{err}</p>
            </div>
          )}
          {okMsg && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{okMsg}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

