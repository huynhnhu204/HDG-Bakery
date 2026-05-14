"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

/* ====== Config (dùng proxy Next khi chạy trên browser) ====== */
const BASE =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "")
    : "";
const API = "/api/v1";
const KEY = "admin_token";

function getToken() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(KEY); } catch { return null; }
}

/* ====== Helpers ====== */
const slugify = (s = "") =>
  s.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const genSKUFromName = (name = "") => {
  const head = (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map((w) => (w[0] ? w[0].toUpperCase() : ""))
    .join("");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return (head || "SKU") + "-" + rand;
};

const Label = ({ children, required = false }) => (
  <label className="block text-sm font-medium mb-1">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
);

const TextInput = ({ className = "", required = false, ...rest }) => (
  <input
    {...rest}
    className={
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-colors " +
      className
    }
    required={required}
  />
);

const TextArea = ({ className = "", ...rest }) => (
  <textarea
    {...rest}
    className={
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-colors " +
      className
    }
  />
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

/* ====== Autocomplete Pills ====== */
function AutocompletePillsInput({
  value,
  onChange,
  placeholder,
  suggests = [],
  label,
  className = "",
}) {
  const [inputText, setInputText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!inputText.trim()) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const lowerText = inputText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const filtered = suggests
      .filter((s) =>
        s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(lowerText)
      )
      .slice(0, 8);
    setFilteredSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setHighlightedIndex(-1);
  }, [inputText, suggests]);

  const addTag = (text) => {
    const trimmed = text.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInputText("");
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const removeTag = (tagToRemove) => onChange(value.filter((t) => t !== tagToRemove));
  const selectSuggestion = (s) => addTag(s);

  const handleKeyDown = (e) => {
    if (showSuggestions) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((p) => (p < filteredSuggestions.length - 1 ? p + 1 : 0));
          return;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((p) => (p > 0 ? p - 1 : filteredSuggestions.length - 1));
          return;
        case "Escape":
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          return;
      }
    }
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        addTag(filteredSuggestions[highlightedIndex]);
      } else {
        addTag(inputText);
      }
    }
  };

  useEffect(() => {
    const clickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
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
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 px-2 py-1 text-xs border border-rose-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 text-rose-500 hover:text-rose-700 hover:bg-rose-200 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="relative flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
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
              onClick={() => addTag(inputText)}
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
                onClick={() => selectSuggestion(s)}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-rose-50 ${
                  i === highlightedIndex ? "bg-rose-100" : ""
                }`}
              >
                {s}
              </div>
            ))}
            {filteredSuggestions.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500 italic">Không tìm thấy gợi ý</div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-400 mt-2">
          Gõ để tìm kiếm gợi ý, dùng ↑↓ để di chuyển, Enter/Tab/"," để thêm
        </div>
      </div>
    </div>
  );
}

/* ====== File Picker (đã fix input file che UI) ====== */
function FilePicker({
  label,
  multiple = false,
  files = [],
  existingUrls = [],
  onChange,
  onRemove,
}) {
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const newFiles = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (!newFiles.length) return;
    onChange(multiple ? [...files, ...newFiles] : [newFiles[0]]);
  };

  return (
    <div className="relative">
      <Label>{label}</Label>

      <div
        className={`border-2 border-dashed rounded-md p-4 text-center transition-colors cursor-pointer ${
          dragActive ? "border-rose-400 bg-rose-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {/* input file ẩn, không phủ lên UI */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={(e) => {
            const nf = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
            if (!nf.length) return;
            onChange(multiple ? [...files, ...nf] : [nf[0]]);
          }}
          className="hidden"
        />

        <p className="text-sm text-gray-500 mb-2">Kéo thả hoặc click để chọn ảnh</p>
        {dragActive && <p className="text-rose-600 text-sm">Thả ảnh vào đây...</p>}
      </div>

      {(existingUrls.length > 0 || previews.length > 0) && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          {existingUrls.map((url, i) => (
            <div key={`url-${i}`} className="relative group">
              <img src={url} alt="" className="h-20 w-full rounded-md object-cover border" />
              <button
                type="button"
                onClick={() => onRemove?.(i, true)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
          {previews.map((src, i) => (
            <div key={`file-${i}`} className="relative group">
              <img src={src} alt="" className="h-20 w-full rounded-md object-cover border" />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-opacity"
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

/* ====== Main ====== */
export default function ProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const newVariant = (order = 0, overrides = {}) => ({
    tempId: Math.random().toString(16).slice(2),
    id: overrides.id ?? null,
    name: overrides.name ?? "",
    weightGram: overrides.weightGram ?? "",
    price: overrides.price ?? "",
    sortOrder: overrides.sortOrder ?? order,
    isDefault: overrides.isDefault ?? order === 0,
  });
  const token = getToken();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    autoSlug: true,
    summary: "",
    contentHtml: "",
    categoryId: "",
    price: "",
    sku: "",
    flavors: [],
    ingredients: [],
    weightGram: "",
    bestBeforeDays: "",
    availableFrom: "",
    channelsSelected: [],
    nutrition: {
      vegan: false,
      glutenFree: false,
      containsNuts: false,
      containsDairy: false,
    },
    tags: [],
    status: 1,
    productNew: false,
    thumbnail: [],
    image: [],
    gallery: [],
    thumbnail_file: null,
    image_file: null,
    gallery_files: [],
  });

  const [categories, setCategories] = useState([]);
  const [tagSuggests, setTagSuggests] = useState([]);
  const [channels, setChannels] = useState([]);
  const [ingredientsSuggests, setIngredientsSuggests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [initialImages, setInitialImages] = useState({ thumbnail: false, image: false });
  const [useVariants, setUseVariants] = useState(false);
  const [variants, setVariants] = useState([newVariant(0, { isDefault: true })]);

  const addVariantRow = () => {
    setVariants((prev) => [...prev, newVariant(prev.length, { isDefault: prev.length === 0 })]);
  };

  const updateVariantField = (index, field, value) => {
    setOkMsg("");
    setVariants((prev) =>
      prev.map((variant, idx) => {
        if (idx !== index) return variant;
        const next = { ...variant, [field]: value };
        if (field === "weightGram") {
          const trimmed = String(value || "").trim();
          next.name = trimmed ? `${trimmed}g` : variant.name;
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

  useEffect(() => {
    (async () => {
      try {
        const pRes = await fetch(`${BASE}${API}/products/${id}`, { cache: "no-store" });
        if (!pRes.ok) throw new Error("Không tìm thấy sản phẩm");
        const product = await pRes.json();

        const cRes = await fetch(`${BASE}${API}/categories`, { headers: { Accept: "application/json" } });
        const cJson = await cRes.json().catch(() => ({}));
        const catList = Array.isArray(cJson?.data) ? cJson.data : Array.isArray(cJson) ? cJson : [];
        setCategories(catList);

        // Load lookups (tagSuggests, channels, allergens) - format=simple cho autocomplete
        const lRes = await fetch(`${BASE}${API}/lookups?format=simple`, { 
          headers: { Accept: "application/json" },
          cache: "no-store"
        }).catch(() => null);
        
        if (lRes && lRes.ok) {
          const lookups = await lRes.json().catch(() => ({}));
          
          // Set tagSuggests (format=simple trả về array strings)
          if (Array.isArray(lookups?.tagSuggests)) {
            setTagSuggests(lookups.tagSuggests);
          }
          
          // Set channels
          if (Array.isArray(lookups?.channels)) {
            setChannels(lookups.channels);
          } else {
            setChannels(["pickup", "delivery"]);
          }
          
          // Set ingredients suggests từ allergens hoặc dùng tagSuggests
          if (Array.isArray(lookups?.allergens) && lookups.allergens.length > 0) {
            const ingNames = lookups.allergens.map(a => a?.name || String(a)).filter(Boolean);
            setIngredientsSuggests(ingNames);
          } else if (Array.isArray(lookups?.tagSuggests)) {
            const commonIngredients = ["bột mì", "trứng", "sữa", "bơ", "đường", "dâu tây", "socola", "kem tươi", "hạnh nhân"];
            const tags = lookups.tagSuggests.map(t => typeof t === 'string' ? t : (t?.tag || t?.name || String(t)));
            setIngredientsSuggests([...commonIngredients, ...tags].slice(0, 20));
          } else {
            setIngredientsSuggests(["bột mì", "trứng", "sữa", "bơ", "đường", "dâu tây", "socola"]);
          }
        } else {
          // Fallback nếu API lỗi
          setTagSuggests(["Sinh nhật", "Cưới", "Trà chiều"]);
          setChannels(["pickup", "delivery"]);
          setIngredientsSuggests(["bột mì", "trứng", "sữa", "bơ", "đường", "dâu tây", "socola"]);
        }

        const meta = product?.meta || {};
        const safe = (x, fb) => (x !== undefined && x !== null ? x : fb);
        const variantList = Array.isArray(product?.variants) ? product.variants : [];
        const hasVariants = variantList.length > 0;
        const primaryVariant = hasVariants
          ? variantList.find((variant) => Number(variant.is_default ?? 0) === 1) ?? variantList[0]
          : null;

        const hasThumbnail = !!product.thumbnail;
        const hasImage = !!product.image;
        
        setInitialImages({ thumbnail: hasThumbnail, image: hasImage });
        setOkMsg("");

        setForm((prev) => ({
          ...prev,
          name: safe(product.name, ""),
          slug: safe(product.slug, ""),
          summary: safe(product.description, ""),
          contentHtml: safe(product.content_html, ""),
          categoryId: safe(product.category_id, ""),
          price: safe(primaryVariant?.price ?? product.price_buy ?? product.price ?? "", ""),
          sku: safe(product.sku, meta.sku ?? ""),
          flavors: safe(product.flavors ?? meta.flavors, []),
          ingredients: safe(product.ingredients ?? meta.ingredients, []),
          weightGram: safe(product.weight_gram ?? meta.weightGram, ""),
          bestBeforeDays: safe(product.best_before_days ?? meta.bestBeforeDays, ""),
          availableFrom: safe(product.available_from ?? meta.availableFrom, ""),
          channelsSelected: safe(product.channels ?? meta.channels, []),
          tags: safe(product.tags ?? meta.tags, []),
          status: Number(safe(product.status, 1)),
          productNew: Boolean(safe(product.product_new, false)),
          thumbnail: product.thumbnail ? [product.thumbnail] : [],
          image: product.image ? [product.image] : [],
          gallery: Array.isArray(product.images) ? product.images.map((g) => g.image).filter(Boolean) : [],
          autoSlug: true,
        }));

        if (hasVariants) {
          setUseVariants(true);
          setVariants(
            variantList.map((variant, idx) =>
              newVariant(idx, {
                id: variant.id ?? null,
                name: variant.name ?? "",
                weightGram: variant.weight_gram !== undefined && variant.weight_gram !== null ? String(variant.weight_gram) : "",
                price: variant.price !== undefined && variant.price !== null ? String(variant.price) : "",
                sortOrder: variant.sort_order ?? idx,
                isDefault: Number(variant.is_default ?? 0) === 1,
              })
            )
          );
        } else {
          setUseVariants(false);
          setVariants([newVariant(0, { isDefault: true })]);
        }
      } catch (err) {
        setError(err.message || "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!form.autoSlug || !form.name.trim()) return;
    const newSlug = slugify(form.name);
    if (newSlug !== form.slug) {
      setForm((prev) => ({ ...prev, slug: newSlug }));
    }
  }, [form.name, form.autoSlug, form.slug]);

  useEffect(() => {
    if (!useVariants) return;
    const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
    if (!defaultVariant) return;
    if (defaultVariant.price !== "" && defaultVariant.price !== form.price) {
      setForm((prev) => ({ ...prev, price: defaultVariant.price }));
    }
  }, [useVariants, variants, form.price]);

  const handleFieldChange = (field, value) => {
    setOkMsg("");
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "name" && value ? { slug: prev.autoSlug ? slugify(value) : prev.slug } : {}),
    }));
    if (field === "name" && value) {
      setForm((prev) => ({ ...prev, autoSlug: prev.slug === slugify(prev.name) }));
    }
  };

  const toggleChannel = (channel) => {
    setForm((prev) => ({
      ...prev,
      channelsSelected: prev.channelsSelected.includes(channel)
        ? prev.channelsSelected.filter((c) => c !== channel)
        : [...prev.channelsSelected, channel],
    }));
  };

  const updateNutrition = (k, v) => setForm((p) => ({ ...p, nutrition: { ...p.nutrition, [k]: v } }));

  const hasVariantPricing = useVariants && variants.some((variant) => variant.name.trim() && variant.price !== "");
  const basePriceValid = String(form.price) !== "" && Number(form.price) >= 0;
  const canSave = form.name.trim() && form.categoryId && (useVariants ? hasVariantPricing : basePriceValid);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setOkMsg("");
    setSaving(true);

    try {
      const fd = new FormData();
      const defaultVariantForSubmit = useVariants ? (variants.find((variant) => variant.isDefault) ?? variants[0]) : null;
      const priceFormValue = useVariants ? (defaultVariantForSubmit?.price ?? form.price) : form.price;

      fd.append("name", form.name);
      if (form.slug) fd.append("slug", form.slug);
      fd.append("category_id", String(form.categoryId));

      // Send price_buy instead of price_sale
      if (priceFormValue !== "") fd.append("price_buy", String(priceFormValue));
      fd.append("status", String(form.status));
      fd.append("product_new", form.productNew ? "1" : "0");
      if (form.summary) fd.append("description", form.summary);
      if (form.contentHtml) fd.append("content", form.contentHtml);
      if (form.sku) fd.append("sku", form.sku);

      form.flavors.forEach((f, i) => fd.append(`flavors[${i}]`, f));
      form.ingredients.forEach((it, i) => fd.append(`ingredients[${i}]`, it));
      form.tags.forEach((t, i) => fd.append(`tags[${i}]`, t));
      if (form.availableFrom) fd.append("availableFrom", form.availableFrom);
      form.channelsSelected.forEach((c, i) => fd.append(`channels[${i}]`, c));

      fd.append("nutrition[vegan]", form.nutrition.vegan ? 1 : 0);
      fd.append("nutrition[glutenFree]", form.nutrition.glutenFree ? 1 : 0);
      fd.append("nutrition[containsNuts]", form.nutrition.containsNuts ? 1 : 0);
      fd.append("nutrition[containsDairy]", form.nutrition.containsDairy ? 1 : 0);

      // Handle thumbnail: send new file if exists, or empty string if existing was explicitly removed
      if (form.thumbnail_file) {
        fd.append("thumbnail_file", form.thumbnail_file);
      } else if (initialImages.thumbnail && form.thumbnail.length === 0) {
        // Had thumbnail initially, but user removed it - signal deletion
        fd.append("thumbnail", "");
      }

      // Handle image: send new file if exists, or empty string if existing was explicitly removed
      if (form.image_file) {
        fd.append("image_file", form.image_file);
      } else if (initialImages.image && form.image.length === 0) {
        // Had image initially, but user removed it - signal deletion
        fd.append("image", "");
      }

      // Handle gallery: send new files
      form.gallery_files.forEach((g) => fd.append("gallery_files[]", g));

      if (useVariants) {
        const cleanedVariants = variants
          .map((variant, idx) => ({
            id: variant.id,
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
          fd.append(`variants[${idx}][name]`, variant.name || weightLabel);
          fd.append(`variants[${idx}][weight_gram]`, String(variant.weightGram));
          fd.append(`variants[${idx}][price]`, String(variant.price));
          fd.append(`variants[${idx}][is_default]`, variant.isDefault ? "1" : "0");
          fd.append(`variants[${idx}][sort_order]`, String(variant.sortOrder ?? idx));
        });
      }

      const res = await fetch(`${BASE}${API}/products/${id}?_method=PUT`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, // KHÔNG set Content-Type cho FormData
        body: fd,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.message || `HTTP ${res.status}`);
      }
 
      setOkMsg("Đã lưu thay đổi thành công!");
      router.replace("/admin/products");
    } catch (err) {
      setError(err.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-rose-50 py-10">
      <div className="mx-auto max-w-6xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-rose-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.push("/admin/products")}
              className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-700 text-sm mb-2"
            >
              ← Danh sách sản phẩm
            </button>
            <h1 className="text-2xl font-semibold text-gray-800">Chỉnh sửa sản phẩm</h1>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              {error}
            </div>
          )}
          {okMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-700">
              {okMsg}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 gap-6">
          {/* Name & Slug */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label required>Tên sản phẩm</Label>
              <TextInput
                value={form.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder="VD: Bánh kem dâu tây 6 inch"
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={form.autoSlug}
                  onChange={(e) => setForm((prev) => ({ ...prev, autoSlug: e.target.checked }))}
                />
                Tự động tạo slug từ tên
              </label>
            </div>
            <div>
              <Label>Slug</Label>
              <TextInput
                value={form.slug}
                onChange={(e) => {
                  handleFieldChange("slug", e.target.value);
                  setForm((prev) => ({ ...prev, autoSlug: false }));
                }}
                placeholder="banh-kem-dau-tay-6-inch"
              />
            </div>
          </div>

          {/* Category & Price */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label required>Danh mục</Label>
              <select
                value={form.categoryId}
                onChange={(e) => handleFieldChange("categoryId", e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <Label required>Giá gốc (VND)</Label>
                <TextInput
                  type="number"
                  min="0"
                  step="1000"
                  value={form.price}
                  onChange={(e) => handleFieldChange("price", e.target.value)}
                  placeholder="VD: 350000"
                  required={!useVariants}
                  disabled={useVariants}
                />
                {useVariants && (
                  <p className="text-xs text-rose-500 mt-1">Giá hiển thị sẽ lấy theo size mặc định.</p>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                <span className="font-semibold">💡 Ghi chú:</span> Tồn kho được quản lý tại module Kho (Stocks). Hệ thống sẽ tính theo size/khối lượng đã cấu hình.
              </div>
            </div>
          </div>

          {/* Flavors & Ingredients */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <AutocompletePillsInput
              value={form.flavors}
              onChange={(flavors) => setForm((prev) => ({ ...prev, flavors }))}
              suggests={tagSuggests}
              placeholder="Gõ hương vị: dâu, socola, matcha…"
              label="Hương vị"
            />
            <AutocompletePillsInput
              value={form.ingredients}
              onChange={(ingredients) => setForm((prev) => ({ ...prev, ingredients }))}
              suggests={ingredientsSuggests}
              placeholder="Gõ thành phần: bột, trứng, kem tươi…"
              label="Thành phần"
            />
          </div>

          {/* Tags */}
          <AutocompletePillsInput
            value={form.tags}
            onChange={(tags) => setForm((prev) => ({ ...prev, tags }))}
            suggests={tagSuggests}
            placeholder="VD: Sinh nhật, Vegan, Không gluten…"
            label="Thẻ (tags)"
          />

          {/* Nutrition */}
          <div>
            <Label>Nhãn dinh dưỡng</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
              <Check
                checked={form.nutrition.vegan}
                onChange={(e) => updateNutrition("vegan", e.target.checked)}
                label="Thuần chay (Vegan)"
              />
              <Check
                checked={form.nutrition.glutenFree}
                onChange={(e) => updateNutrition("glutenFree", e.target.checked)}
                label="Không gluten"
              />
              <Check
                checked={form.nutrition.containsNuts}
                onChange={(e) => updateNutrition("containsNuts", e.target.checked)}
                label="Có hạt"
              />
              <Check
                checked={form.nutrition.containsDairy}
                onChange={(e) => updateNutrition("containsDairy", e.target.checked)}
                label="Có sữa"
              />
            </div>
          </div>

          <div className="rounded-lg border border-rose-100 bg-rose-50/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-rose-700">Bảng giá theo size / khối lượng</p>
                <p className="text-xs text-rose-500">Quản lý giá theo từng kích thước, gram. Size mặc định sẽ hiển thị trước.</p>
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label>Mô tả ngắn</Label>
              <TextArea
                rows={4}
                value={form.summary}
                onChange={(e) => handleFieldChange("summary", e.target.value)}
                placeholder="Mô tả hương vị, kết cấu, gợi ý thưởng thức…"
              />
            </div>
            <div>
              <Label>Mô tả chi tiết</Label>
              <ReactQuill
                value={form.contentHtml}
                onChange={(value) => handleFieldChange("contentHtml", value)}
                className="bg-white"
                theme="snow"
              />
            </div>
          </div>

          {/* Images */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <FilePicker
              label="Ảnh đại diện"
              multiple={false}
              files={form.thumbnail_file ? [form.thumbnail_file] : []}
              existingUrls={form.thumbnail}
              onChange={(files) => setForm((prev) => ({ ...prev, thumbnail_file: files[0] || null }))}
              onRemove={(index, isExisting) => {
                if (isExisting) {
                  setForm((prev) => ({ ...prev, thumbnail: prev.thumbnail.filter((_, i) => i !== index) }));
                } else {
                  setForm((prev) => ({ ...prev, thumbnail_file: null }));
                }
              }}
            />
            <FilePicker
              label="Ảnh chính"
              multiple={false}
              files={form.image_file ? [form.image_file] : []}
              existingUrls={form.image}
              onChange={(files) => setForm((prev) => ({ ...prev, image_file: files[0] || null }))}
              onRemove={(index, isExisting) => {
                if (isExisting) {
                  setForm((prev) => ({ ...prev, image: prev.image.filter((_, i) => i !== index) }));
                } else {
                  setForm((prev) => ({ ...prev, image_file: null }));
                }
              }}
            />
            <FilePicker
              label="Bộ sưu tập"
              multiple
              files={form.gallery_files}
              existingUrls={form.gallery}
              onChange={(files) => setForm((prev) => ({ ...prev, gallery_files: files }))}
              onRemove={(index, isExisting) => {
                if (isExisting) {
                  setForm((prev) => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== index) }));
                } else {
                  setForm((prev) => ({ ...prev, gallery_files: prev.gallery_files.filter((_, i) => i !== index) }));
                }
              }}
            />
          </div>

          {/* Channels & Status */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-4">
            <div>
              <Label>SKU</Label>
              <div className="flex gap-2">
                <TextInput
                  value={form.sku}
                  onChange={(e) => handleFieldChange("sku", e.target.value)}
                  placeholder="VD: CAKE-STR-6IN"
                />
                <button
                  type="button"
                  onClick={() => handleFieldChange("sku", genSKUFromName(form.name || "SP"))}
                  className="rounded-md border border-gray-300 px-3 text-sm hover:bg-gray-50"
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
                    checked={form.channelsSelected.includes(c)}
                    onChange={() => toggleChannel(c)}
                    label={c === "pickup" ? "Pickup" : "Delivery"}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Trạng thái</Label>
              <div className="flex items-center gap-6 mt-1">
                <Radio
                  name="status"
                  value={0}
                  checked={form.status === 0}
                  onChange={() => handleFieldChange("status", 0)}
                  label="Bản nháp"
                />
                <Radio
                  name="status"
                  value={1}
                  checked={form.status === 1}
                  onChange={() => handleFieldChange("status", 1)}
                  label="Đăng ngay"
                />
              </div>
            </div>
            <div>
              <Label>Tùy chọn</Label>
              <div className="flex flex-col gap-2 mt-1">
                <Check
                  checked={form.productNew}
                  onChange={(e) => handleFieldChange("productNew", e.target.checked)}
                  label="Sản phẩm mới (hiển thị ở trang chủ)"
                />
              </div>
            </div>
          </div>

          {/* Extra meta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label>Ngon nhất trong (ngày)</Label>
              <TextInput
                type="number"
                min="0"
                value={form.bestBeforeDays}
                onChange={(e) => handleFieldChange("bestBeforeDays", e.target.value)}
                placeholder="3"
              />
            </div>
            <div>
              <Label>Bán từ ngày</Label>
              <TextInput
                type="date"
                value={form.availableFrom}
                onChange={(e) => handleFieldChange("availableFrom", e.target.value)}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!canSave || saving}
              className="px-6 py-2 text-sm font-medium text-white bg-rose-500 rounded-md hover:bg-rose-600 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                  Đang lưu...
                </>
              ) : (
                "💾 Lưu thay đổi"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
