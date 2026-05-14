"use client";

import { useEffect, useMemo, useState, useCallback, memo } from "react";
import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import FavoriteButton from "@/components/FavoriteButton";
import CategoryCards from "@/components/CategoryCards";

const RAW_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "")
    .replace(/\/+$/, "") ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://127.0.0.1:8000");

const BASE_API = `${RAW_BASE}/api/v1`;
const PAGE_SIZE = 24;

// khoảng giá
const PRICE_BUCKETS = [
  { key: "p1", label: "0 - 50.000đ", min: 0, max: 50000 },
  { key: "p2", label: "50.000đ - 100.000đ", min: 50000, max: 100000 },
  { key: "p3", label: "100.000đ - 200.000đ", min: 100000, max: 200000 },
  { key: "p4", label: "200.000đ - 300.000đ", min: 200000, max: 300000 },
  { key: "p5", label: "≥ 300.000đ", min: 300000, max: 999999999 },
];

const SORT_MAP = {
  newest: "created_desc",
  az: "name_asc",
  za: "name_desc",
  price_asc: "price_asc",
  price_desc: "price_desc",
  sale: "discount_desc",
};

// Sort client-side cho các trường hợp không có backend support
function sortClientSide(items, sortKey) {
  if (!items.length) return items;
  
  switch (sortKey) {
    case 'popular':
      return [...items].sort((a, b) => {
        if (a.product_new && !b.product_new) return -1;
        if (!a.product_new && b.product_new) return 1;
        const scoreA = (a.product_new ? 100 : 0) + (a.id % 50);
        const scoreB = (b.product_new ? 100 : 0) + (b.id % 50);
        return scoreB - scoreA;
      });
      
    case 'bestseller':
      return [...items].sort((a, b) => {
        const discountA = a.price_buy > 0 ? ((a.price_buy - (a.price_sale || a.price_buy)) / a.price_buy) * 100 : 0;
        const discountB = b.price_buy > 0 ? ((b.price_buy - (b.price_sale || b.price_buy)) / b.price_buy) * 100 : 0;
        if (discountB !== discountA) return discountB - discountA;
        if (a.product_new && !b.product_new) return -1;
        if (!a.product_new && b.product_new) return 1;
        return b.id - a.id;
      });
      
    default:
      return items;
  }
}

async function getJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return {};
  return res.json().catch(() => ({}));
}

// ProductCard component với grid và list view
const ProductCard = memo(({ product: p, index, viewMode, addingIds, setAddingIds, calcDiscount }) => {
  const discount = useMemo(() => calcDiscount(p), [p, calcDiscount]);
  const price = useMemo(() => p.price_sale && p.price_sale < p.price_buy ? p.price_sale : p.price_buy, [p]);
  const old = useMemo(() => p.price_sale && p.price_sale < p.price_buy ? p.price_buy : null, [p]);
  const hasValidPrice = price > 0;
  const showOldPrice = old && old > 0 && price < old;
  const adding = addingIds.has(p.id);
  
  const img = useMemo(() => {
    let imageUrl = p.thumbnail || p.image || "/slide1.jpg";
    if (imageUrl && !imageUrl.startsWith("http")) {
      const cleaned = imageUrl.replace(/^\/+/, "");
      imageUrl = `${RAW_BASE}/api/v1/storage/${cleaned.replace(/^storage\//, "")}`;
    }
    return imageUrl;
  }, [p.thumbnail, p.image]);

  const handleCartClick = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAddingIds(prev => new Set(prev).add(p.id));
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "{}");
      if (!cart.items) cart.items = [];
      
      const existingItem = cart.items.find(item => item.product_id === p.id);
      if (existingItem) {
        existingItem.qty += 1;
      } else {
        cart.items.push({
          product_id: p.id,
          name: p.name,
          price: price,
          qty: 1,
          thumb: img,
        });
      }
      
      localStorage.setItem("cart", JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent("cart-updated"));
      alert("✅ Đã thêm vào giỏ hàng!");
    } catch (err) {
      alert("Có lỗi xảy ra");
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    }
  }, [p.id, p.name, price, img, setAddingIds]);
  
  // Grid View
  if (viewMode === "grid") {
    return (
      <div
        className="bg-white rounded-lg shadow-sm hover:shadow-lg overflow-hidden transition-all duration-300 relative border border-gray-100 flex flex-col h-full anim-up card-pop group"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
          <Link href={`/product/${p.slug || p.id}`}>
            <Image
              src={img}
              alt={p.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              unoptimized={img.startsWith("http") && !img.includes("127.0.0.1") && !img.includes("localhost")}
            />
          </Link>
          
          {discount > 0 && (
            <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded z-10">
              -{discount}%
            </span>
          )}
          
          {/* Heart icon - Top Right */}
          <div className="absolute top-2 right-2 z-10">
            <FavoriteButton 
              productId={p.id} 
              className="bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:scale-110 transition-transform shadow-sm" 
            />
          </div>
          
          {/* Two action buttons - Bottom Center (only visible on hover) */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <button
              onClick={handleCartClick}
              disabled={adding}
              className="bg-white/95 backdrop-blur-md text-amber-700 rounded-full p-3 hover:bg-amber-700 hover:text-white transition-all duration-300 hover:scale-110 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              title="Thêm vào giỏ hàng"
            >
              {adding ? (
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                  <path d="M3 6h18"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              )}
            </button>
            <Link
              href={`/product/${p.slug || p.id}`}
              className="bg-white/95 backdrop-blur-md text-amber-700 rounded-full p-3 hover:bg-amber-700 hover:text-white transition-all duration-300 hover:scale-110 shadow-xl"
              title="Xem chi tiết"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </Link>
          </div>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3
            className="text-base font-bold text-gray-900 mb-2 line-clamp-2"
            title={p.name}
          >
            {p.name}
          </h3>
          <div className="mt-auto">
            {hasValidPrice ? (
              <>
                {showOldPrice && (
                  <del className="text-sm text-gray-400 mr-2">
                    {old.toLocaleString("vi-VN")}₫
                  </del>
                )}
                <span className="text-lg font-bold text-amber-600">
                  {price.toLocaleString("vi-VN")}₫
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-400 italic">Liên hệ</span>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // List View
  return (
    <article
      className="bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow flex anim-up card-pop"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Image container - bên trái */}
      <div className="relative w-40 h-40 flex-shrink-0">
        <Link href={`/product/${p.slug || p.id}`}>
          <Image
            src={img}
            alt={p.name}
            fill
            sizes="160px"
            className="object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
            unoptimized={img.startsWith("http") && !img.includes("127.0.0.1") && !img.includes("localhost")}
          />
        </Link>
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded z-10">
            -{discount}%
          </span>
        )}
      </div>
      
      {/* Product info - bên phải */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          {/* Tên sản phẩm */}
          <Link href={`/product/${p.slug || p.id}`}>
            <h3 className="text-base font-bold text-gray-800 mb-2 hover:text-amber-600 transition-colors line-clamp-2">
              {p.name}
            </h3>
          </Link>
          
          {/* Đường line đứt màu vàng/nâu */}
          <div className="border-t-2 border-dashed border-amber-400 mb-3"></div>
          
          {/* Price */}
          <div className="mb-3">
            {hasValidPrice ? (
              <>
                {showOldPrice && (
                  <del className="text-sm text-gray-400 mr-2">
                    {old.toLocaleString("vi-VN")}₫
                  </del>
                )}
                <span className="text-2xl font-bold text-amber-700">
                  {price.toLocaleString("vi-VN")}₫
                </span>
              </>
            ) : (
              <span className="text-xs text-gray-400 italic">Liên hệ</span>
            )}
          </div>
        </div>
        
        {/* 3 nút tròn */}
        <div className="flex gap-2">
          {/* Nút giỏ hàng */}
          <button
            onClick={handleCartClick}
            disabled={adding}
            className="bg-amber-700 text-white rounded-full p-2.5 hover:bg-amber-800 transition-colors disabled:opacity-50"
            title="Thêm vào giỏ hàng"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M4 4h16l-2 12H6L4 4zm8 15a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>
          {/* Nút xem chi tiết */}
          <Link 
            href={`/product/${p.slug || p.id}`}
            className="bg-amber-700 text-white rounded-full p-2.5 hover:bg-amber-800 transition-colors"
            title="Xem chi tiết"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 001.48-8.99 6.5 6.5 0 00-9.19 9.19 6.5 6.5 0 008.99-1.48l.27.28v.79l5 5-1.5 1.5-5-5zm-6 0A4.5 4.5 0 115 9.5 4.5 4.5 0 0110 14z" />
            </svg>
          </Link>
          {/* Nút yêu thích */}
          <FavoriteButton productId={p.id} className="bg-amber-700 text-white rounded-full p-2.5 hover:bg-amber-800 transition-colors" />
        </div>
      </div>
    </article>
  );
});

ProductCard.displayName = "ProductCard";

export default function CategoryPage({ params }) {
  const { slug } = params;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ===== initial state từ URL =====
  const initial = useMemo(() => {
    const sp = searchParams;
    return {
      page: Math.max(1, Number(sp.get("page") || 1)),
      sort: sp.get("sort") || "newest",
      q: sp.get("q") || "",
      priceKeys: sp.getAll("price"),
      types: sp.getAll("type"),
      weights: sp.getAll("weight"),
    };
  }, []);

  const [page, setPage] = useState(initial.page);
  const [sort, setSort] = useState(initial.sort);
  const [q, setQ] = useState(initial.q);
  const [priceKeys, setPriceKeys] = useState(initial.priceKeys);
  const [types, setTypes] = useState(initial.types);
  const [weights, setWeights] = useState(initial.weights);
  const [viewMode, setViewMode] = useState("grid"); // "grid" hoặc "list"

  const [cats, setCats] = useState([]);
  const [facetCounts, setFacetCounts] = useState({});
  const [facetTypes, setFacetTypes] = useState([]);
  const [facetWeights, setFacetWeights] = useState([]);

  const [items, setItems] = useState([]);
  const [rawItems, setRawItems] = useState([]); // Lưu data gốc trước khi sort client-side
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addingIds, setAddingIds] = useState(new Set()); // Track sản phẩm đang được thêm vào giỏ

  const apiUrl = useMemo(() => {
    const u = new URL(`${BASE_API}/products`);
    u.searchParams.set("status", "1");
    u.searchParams.set("per_page", String(PAGE_SIZE));
    u.searchParams.set("page", String(page));
    
    // Chỉ set sort param nếu không phải popular/bestseller (sort ở frontend)
    const backendSort = SORT_MAP[sort];
    if (backendSort) {
      u.searchParams.set("sort", backendSort);
    } else {
      u.searchParams.set("sort", "created_desc");
    }
    
    u.searchParams.set("category_slug", slug);
    if (q) u.searchParams.set("q", q);
    if (priceKeys.length) {
      const picked = PRICE_BUCKETS.filter((b) => priceKeys.includes(b.key));
      if (picked.length) {
        const pmin = Math.min(...picked.map((x) => x.min));
        const pmax = Math.max(...picked.map((x) => x.max));
        u.searchParams.set("pmin", String(pmin));
        u.searchParams.set("pmax", String(pmax));
      }
    }
    types.forEach((t) => u.searchParams.append("types[]", t));
    weights.forEach((w) => u.searchParams.append("weights[]", w));
    return u.toString();
  }, [page, sort, q, priceKeys, types, weights, slug]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const [listRes, catRes, facetRes] = await Promise.all([
        getJson(apiUrl),
        getJson(`${BASE_API}/categories?withCounts=1`),
        getJson(`${BASE_API}/product-facets`),
      ]);
      if (!alive) return;
      
      const fetchedItems = listRes?.data || [];
      setRawItems(fetchedItems); // Lưu raw data
      setTotal(listRes?.total || 0);
      setTotalPages(listRes?.last_page || 1);

      const catArr = Array.isArray(catRes)
        ? catRes
        : Array.isArray(catRes?.data)
        ? catRes.data
        : [];
      const counts = {};
      catArr.forEach((c) => (counts[c.slug] = c.products_count ?? 0));
      setCats(catArr);
      setFacetCounts(counts);
      setFacetTypes(facetRes.types || []);
      setFacetWeights(facetRes.weights || []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [apiUrl]);

  // Sort lại khi sort key hoặc rawItems thay đổi
  useEffect(() => {
    let data = rawItems;
    if (!Array.isArray(data)) data = [];
    const sorted = sortClientSide(data, sort);
    setItems(sorted);
  }, [rawItems, sort]);

  // Cập nhật URL mỗi khi thay đổi filter
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    priceKeys.forEach((v) => p.append("price", v));
    types.forEach((v) => p.append("type", v));
    weights.forEach((v) => p.append("weight", v));
    if (sort !== "newest") p.set("sort", sort);
    if (page > 1) p.set("page", String(page));
    router.replace(`${pathname}?${p.toString()}`);
  }, [q, priceKeys, types, weights, sort, page, router, pathname]);

  // Helpers
  const toggleMulti = (val, list, setter) => {
    setter(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
    setPage(1);
  };

  const resetFilters = () => {
    setSort("newest");
    setQ("");
    setPriceKeys([]);
    setTypes([]);
    setWeights([]);
    setPage(1);
  };

  const calcDiscount = (p) =>
    p.price_buy && p.price_sale && p.price_sale < p.price_buy
      ? Math.round(100 - (p.price_sale / p.price_buy) * 100)
      : 0;

  const goPage = (n) => {
    const target = Math.max(1, Math.min(totalPages, n));
    setPage(target);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Category Cards Banner - đồng nhất với /product và /product/sale */}
      <CategoryCards />
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8 anim-fade-in">
      <Script id="ld-category" type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: slug,
        })}
      </Script>

      <h1 className="text-3xl font-serif font-extrabold text-center mb-3">
        Danh mục: {slug.replace(/-/g, " ")}
      </h1>
      <p className="text-center text-amber-700 mb-6">🍞🥐🍰 Mời bạn chọn bánh yêu thích!</p>

      {/* View Mode Toggle + Sort + Search */}
      <div className="mb-5 flex flex-wrap gap-3 items-center justify-between">
        {/* Left: View Mode + Sort */}
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-0 border rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-4 py-2 text-sm font-medium transition ${
                viewMode === "grid"
                  ? "bg-amber-500 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              title="Dạng lưới"
            >
              <span className="text-base">⊞</span>
            </button>
            <div className="w-px h-6 bg-gray-300"></div>
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 text-sm font-medium transition ${
                viewMode === "list"
                  ? "bg-amber-500 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              title="Dạng danh sách"
            >
              <span className="text-base">☰</span>
            </button>
          </div>
          
          {/* Sort Dropdown */}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-500 bg-white font-medium"
          >
            <option value="newest">Mới nhất</option>
            <option value="sale">Đang giảm giá nhiều</option>
            <option value="popular">Xem nhiều nhất</option>
            <option value="bestseller">Bán chạy nhất</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
            <option value="price_asc">Giá tăng dần ↑</option>
            <option value="price_desc">Giá giảm dần ↓</option>
          </select>
        </div>

        {/* Right: Search */}
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm sản phẩm…"
            className="h-10 rounded-lg border-2 border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') setPage(1);
            }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="text-gray-400 hover:text-amber-600 transition"
              title="Xóa"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={resetFilters}
            className="h-10 px-4 rounded-lg bg-gray-200 text-gray-800 text-sm hover:bg-gray-300 transition"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 space-y-4">
          {/* Danh mục */}
          <section className="rounded-xl border bg-amber-50">
            <h3 className="px-4 py-2.5 font-semibold bg-amber-600 text-white rounded-t-xl">
              Danh mục sản phẩm
            </h3>
          <ul className="p-3 space-y-1">
            {cats.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className={
                    "w-full flex justify-between px-2 py-1.5 rounded " +
                    (c.slug === slug ? "bg-amber-100 font-semibold" : "hover:bg-amber-100")
                  }
                >
                  <span>{c.name}</span>
                  <span className="text-xs opacity-70">({c.products_count ?? 0})</span>
                </Link>
              </li>
            ))}
          </ul>
          </section>

          {/* Giá */}
          <section className="rounded-xl border bg-amber-50">
            <h3 className="px-4 py-2.5 font-semibold bg-amber-600 text-white rounded-t-xl">
              Chọn mức giá
            </h3>
            <div className="p-3 space-y-2 text-sm">
              {PRICE_BUCKETS.map((b) => (
                <label key={b.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={priceKeys.includes(b.key)}
                    onChange={() => toggleMulti(b.key, priceKeys, setPriceKeys)}
                  />
                  <span>{b.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Loại */}
          <section className="rounded-xl border bg-amber-50">
            <h3 className="px-4 py-2.5 font-semibold bg-amber-600 text-white rounded-t-xl">
              Loại bánh
            </h3>
            <div className="p-3 space-y-2 text-sm">
              {facetTypes.map((t) => (
                <label key={t} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={types.includes(t)}
                    onChange={() => toggleMulti(t, types, setTypes)}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Trọng lượng */}
          <section className="rounded-xl border bg-amber-50">
            <h3 className="px-4 py-2.5 font-semibold bg-amber-600 text-white rounded-t-xl">
              Trọng lượng
            </h3>
            <div className="p-3 space-y-2 text-sm">
              {facetWeights.map((w) => (
                <label key={w} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={weights.includes(w)}
                    onChange={() => toggleMulti(w, weights, setWeights)}
                  />
                  <span>{w}</span>
                </label>
              ))}
            </div>
          </section>
        </aside>

        {/* Products */}
        <section className="col-span-12 md:col-span-9">
          {loading ? (
            <>
              <div className={viewMode === "grid" 
                ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
                : "space-y-4"
              }>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={`bg-white rounded-xl shadow overflow-hidden ${
                    viewMode === "list" ? "flex" : ""
                  }`}>
                    <div className={`skeleton ${viewMode === "list" ? "w-32 h-32 flex-shrink-0" : "h-40"}`}></div>
                    <div className={`p-3 space-y-2 ${viewMode === "list" ? "flex-1" : ""}`}>
                      <div className="h-4 w-5/6 skeleton rounded"></div>
                      <div className="h-4 w-2/3 skeleton rounded"></div>
                      {viewMode === "list" && <div className="h-4 w-4/5 skeleton rounded"></div>}
                      <div className="h-5 w-1/2 skeleton rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className={viewMode === "grid" 
                ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
                : "space-y-4"
              }>
                {items.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    index={i}
                    viewMode={viewMode}
                    addingIds={addingIds}
                    setAddingIds={setAddingIds}
                    calcDiscount={calcDiscount}
                  />
                ))}
              </div>

              {/* PHÂN TRANG */}
              {totalPages > 1 && (
                <nav className="mt-6 flex items-center justify-center gap-1 text-sm anim-up">
                  <button
                    className="px-3 h-9 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => goPage(page - 1)}
                    disabled={page <= 1}
                    aria-label="Trang trước"
                  >
                    ← Trước
                  </button>

                  {/* Trang đầu */}
                  <button
                    onClick={() => goPage(1)}
                    className={
                      "px-3 h-9 rounded border " +
                      (page === 1 ? "bg-amber-500 text-white border-amber-500" : "bg-white hover:bg-gray-50")
                    }
                  >
                    1
                  </button>

                  {/* ... trước */}
                  {page > 3 && <span className="px-2">…</span>}

                  {/* Trang quanh hiện tại */}
                  {Array.from({ length: Math.max(0, Math.min(totalPages, page + 1) - Math.max(2, page - 1) + 1) }).map(
                    (_, idx) => {
                      const pIdx = Math.max(2, page - 1) + idx;
                      if (pIdx >= totalPages) return null;
                      return (
                        <button
                          key={pIdx}
                          onClick={() => goPage(pIdx)}
                          className={
                            "px-3 h-9 rounded border " +
                            (page === pIdx
                              ? "bg-amber-500 text-white border-amber-500"
                              : "bg-white hover:bg-gray-50")
                          }
                        >
                          {pIdx}
                        </button>
                      );
                    }
                  )}

                  {/* ... sau */}
                  {page < totalPages - 2 && <span className="px-2">…</span>}

                  {/* Trang cuối */}
                  {totalPages > 1 && (
                    <button
                      onClick={() => goPage(totalPages)}
                      className={
                        "px-3 h-9 rounded border " +
                        (page === totalPages
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white hover:bg-gray-50")
                      }
                    >
                      {totalPages}
                    </button>
                  )}

                  <button
                    className="px-3 h-9 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => goPage(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Trang sau"
                  >
                    Sau →
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
      </main>
    </>
  );
}
