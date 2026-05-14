"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import FavoriteButton from "./FavoriteButton";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

function toVNDC(n) {
  if (n == null) return "";
  try {
    return Number(n).toLocaleString("vi-VN") + "₫";
  } catch {
    return `${n}₫`;
  }
}

function calcDiscountLabel(priceBuy, priceSale) {
  const buy = Number(priceBuy ?? 0);
  const sale = Number(priceSale ?? 0);
  if (!sale || sale >= buy || buy <= 0) return "";
  const pct = Math.round(((buy - sale) / buy) * 100);
  return pct > 0 ? `-${pct}%` : "";
}

async function safeFetch(url) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.data)) return json.data;
    if (Array.isArray(json?.data?.data)) return json.data.data;
    return [];
  } catch {
    return [];
  }
}

function normalizeProduct(p) {
  if (!p) return null;
  const priceBuy = p.price_buy ?? p.price ?? p.price_base ?? 0;
  const priceSale = p.price_sale ?? null;
  
  // Xử lý URL ảnh giống như trang /product
  let thumbnail = p.image_url || p.thumbnail || p.image || "/slide1.jpg";
  if (thumbnail && !thumbnail.startsWith("http")) {
    const cleaned = thumbnail.replace(/^\/+/, "");
    thumbnail = `${API_BASE}/api/v1/storage/${cleaned.replace(/^storage\//, "")}`;
  }

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    thumbnail: thumbnail,
    price_buy: Number(priceBuy || 0),
    price_sale: priceSale != null ? Number(priceSale) : null,
    category_slug: p.category?.slug,
    category: p.category,
  };
}

export default function AllProducts() {
  const [allItems, setAllItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");

      try {
        // Fetch tất cả products và categories
        const [products, cats] = await Promise.all([
          safeFetch(`${API_BASE}/api/v1/products?status=1&per_page=50`),
          safeFetch(`${API_BASE}/api/v1/categories?status=1&withCounts=1&per_page=0`)
        ]);
        
        const norm = products.map(normalizeProduct).filter(Boolean);
        const catList = Array.isArray(cats) ? cats : cats?.data || [];

        if (!alive) return;
        setAllItems(norm);
        setCategories(catList);
        setLoading(false);
      } catch (e) {
        if (alive) {
          setErr(e?.message || "Fetch error");
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Filter items theo category
  const items = selectedCategory 
    ? allItems.filter(p => p.category_slug === selectedCategory || p.category?.slug === selectedCategory)
    : allItems.slice(0, 10);

  const hasItems = items.length > 0;

  const Card = ({ prod }) => {
    const priceBuy = prod.price_buy ?? 0;
    const priceSale = prod.price_sale ?? null;
    const discountLabel = calcDiscountLabel(priceBuy, priceSale);
    const productHref = `/product/${prod.slug || prod.id}`;

    return (
      <article className="bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow flex h-full">
        {/* Image container - bên trái */}
        <div className="relative w-40 h-40 flex-shrink-0">
          <Link href={productHref}>
            <img
              src={prod.thumbnail || "/slide1.jpg"}
              alt={`Hình ảnh của ${prod.name}`}
              title={prod.name}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              loading="lazy"
              onError={(e) => {
                const el = e.currentTarget;
                if (el.dataset.fallback === "1") return;
                el.dataset.fallback = "1";
                el.src = "/slide1.jpg";
              }}
            />
          </Link>
        </div>
        
        {/* Product info - bên phải */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            {/* Tên sản phẩm */}
            <Link href={productHref}>
              <h3 className="text-base font-bold text-gray-800 mb-2 hover:text-amber-600 transition-colors">
                {prod.name}
              </h3>
            </Link>
            
            {/* Đường line đứt màu vàng/nâu */}
            <div className="border-t-2 border-dashed border-amber-400 mb-3"></div>
            
            {/* Price */}
            <div className="mb-3">
              {priceSale && priceSale < priceBuy ? (
                <>
                  <del className="text-sm text-gray-400 mr-2">
                    {priceBuy.toLocaleString("vi-VN")}₫
                  </del>
                  <span className="text-2xl font-bold" style={{ color: '#d97706' }}>
                    {priceSale.toLocaleString("vi-VN")}₫
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold" style={{ color: '#d97706' }}>
                  {priceBuy.toLocaleString("vi-VN")}₫
                </span>
              )}
            </div>
          </div>
          
          {/* 3 nút tròn - Đã cải thiện icon */}
          <div className="flex gap-2">
            {/* Nút giỏ hàng - Icon shopping cart cải thiện */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  const priceBuy = prod.price_buy ?? 0;
                  const priceSale = prod.price_sale ?? null;
                  const price = priceSale && priceSale < priceBuy ? priceSale : priceBuy;
                  let img = prod.thumbnail || "/slide1.jpg";
                  if (img && !img.startsWith("http")) {
                    const cleaned = img.replace(/^\/+/, "");
                    img = `${API_BASE}/api/v1/storage/${cleaned.replace(/^storage\//, "")}`;
                  }
                  const raw = localStorage.getItem("cart") || "{}";
                  const cart = JSON.parse(raw);
                  if (!cart.items) cart.items = [];
                  const existing = cart.items.find((it) => it.product_id === prod.id);
                  if (existing) {
                    existing.qty = (existing.qty || 1) + 1;
                  } else {
                    cart.items.push({
                      product_id: prod.id,
                      name: prod.name,
                      price: Number(price || 0),
                      qty: 1,
                      thumb: img
                    });
                  }
                  localStorage.setItem("cart", JSON.stringify(cart));
                  window.dispatchEvent(new CustomEvent("cart-updated"));
                  alert("✅ Đã thêm vào giỏ hàng!");
                } catch {
                  alert("Có lỗi xảy ra. Vui lòng thử lại.");
                }
              }}
              className="group bg-amber-700 text-white rounded-full p-2.5 hover:bg-amber-800 transition-all duration-300 hover:scale-110 active:scale-95 shadow-md hover:shadow-xl"
              aria-label="Thêm vào giỏ hàng"
              title="Thêm vào giỏ hàng"
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="transition-transform duration-300 group-hover:scale-110"
              >
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </button>
            {/* Nút xem chi tiết - Icon mắt (eye) để xem */}
            <Link 
              href={productHref}
              className="group bg-amber-700 text-white rounded-full p-2.5 hover:bg-amber-800 transition-all duration-300 hover:scale-110 active:scale-95 shadow-md hover:shadow-xl"
              aria-label="Xem chi tiết"
              title="Xem chi tiết"
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="transition-transform duration-300 group-hover:scale-110"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </Link>
            {/* Nút yêu thích */}
            <FavoriteButton 
              productId={prod.id} 
              className="group bg-amber-700 text-white rounded-full p-2.5 hover:bg-amber-800 transition-all duration-300 hover:scale-110 active:scale-95 shadow-md hover:shadow-xl" 
            />
          </div>
        </div>
      </article>
    );
  };

  if (loading) {
    return (
      <section className="mb-10 py-6" aria-busy="true">
        <h2 className="sr-only">Đang tải sản phẩm</h2>
        <p className="text-center text-gray-500">Đang tải sản phẩm…</p>
      </section>
    );
  }
  if (err) {
    return (
      <section className="mb-10 py-6" aria-live="assertive">
        <h2 className="sr-only">Lỗi tải sản phẩm</h2>
        <p className="text-center text-red-600">
          Lỗi tải dữ liệu: {String(err)}
        </p>
      </section>
    );
  }

  return (
    <>
      <section
        id="products-all"
        className="mb-10 py-8 bg-[#faf7f2] border-y border-amber-200"
        aria-label="Tất cả bánh"
      >
        <div className="max-w-7xl mx-auto px-4">
          {/* Title với decorative underline */}
          <div className="text-center mb-6 relative">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-wide inline-block" style={{ fontFamily: 'Georgia, serif' }}>
              Tất cả bánh
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
            </h2>
          </div>

          {/* Layout với sidebar và products */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar Categories */}
            <aside className="md:col-span-1">
              <div className="sticky top-4 bg-white border border-amber-200 rounded-xl p-4">
                <h3 className="font-bold text-amber-700 mb-4 pb-3 border-b border-amber-200">Danh mục</h3>
                <ul className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  <li>
                    <button
                      onClick={() => setSelectedCategory("")}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedCategory === "" 
                          ? "bg-amber-600 text-white" 
                          : "text-gray-700 hover:bg-amber-50"
                      }`}
                    >
                      Tất cả sản phẩm
                    </button>
                  </li>
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <button
                        onClick={() => setSelectedCategory(cat.slug)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedCategory === cat.slug 
                            ? "bg-amber-600 text-white" 
                            : "text-gray-700 hover:bg-amber-50"
                        }`}
                      >
                        {cat.name}
                        {cat.products_count > 0 && (
                          <span className="text-xs ml-2 opacity-75">
                            ({cat.products_count})
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* Products Grid - 2 columns */}
            <div className="md:col-span-3">
              {loading ? (
                <p className="text-center text-gray-500 py-12">Đang tải sản phẩm...</p>
              ) : hasItems ? (
                <div
                  className="grid grid-cols-2 gap-4"
                  role="list"
                >
                  {items.map((p) => (
                    <Card key={`all-${p.id}`} prod={p} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-12">Chưa có sản phẩm trong danh mục này.</p>
              )}
            </div>
          </div>
          
          {/* Button Xem tất cả */}
          {hasItems && !selectedCategory && (
            <div className="mt-8 text-center">
              <Link 
                href="/product"
                className="inline-block border-2 border-amber-600 text-amber-700 px-8 py-3 rounded-lg font-semibold hover:bg-amber-50 transition-colors"
              >
                Xem tất cả
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
