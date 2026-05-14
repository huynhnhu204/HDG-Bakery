"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FavoriteButton from "@/components/FavoriteButton";
import CategoryCards from "@/components/CategoryCards";

/** ====== Config ====== */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

/* ========= Bộ lọc giá ========= */
const PRICE_BUCKETS = [
  { key: "p1", label: "0 - 50.000đ", min: 0, max: 50000 },
  { key: "p2", label: "50.000đ - 100.000đ", min: 50000, max: 100000 },
  { key: "p3", label: "100.000đ - 200.000đ", min: 100000, max: 200000 },
  { key: "p4", label: "200.000đ - 300.000đ", min: 200000, max: 300000 },
  { key: "p5", label: "≥ 300.000đ", min: 300000, max: 999999999 },
];

/** ====== Helpers ====== */
function formatVND(n) {
  if (n == null || isNaN(Number(n))) return "";
  return Math.round(Number(n)).toLocaleString("vi-VN") + " đ";
}

function formatDate(dt) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dt;
  }
}

function getSaleStatus(sale) {
  const now = new Date();
  const begin = new Date(sale.date_begin);
  const end = new Date(sale.date_end);
  
  if (now < begin) {
    return {
      label: "Sắp diễn ra",
      color: "bg-blue-100 text-blue-800",
      badge: "Sắp bắt đầu"
    };
  }
  if (now > end) {
    return {
      label: "Đã kết thúc",
      color: "bg-gray-100 text-gray-800",
      badge: "Hết hạn"
    };
  }
  if (sale.status === 1) {
    return {
      label: "Đang diễn ra",
      color: "bg-red-100 text-red-800",
      badge: "Hot Sale"
    };
  }
  return {
    label: "Đã tắt",
    color: "bg-gray-100 text-gray-800",
    badge: "Tạm dừng"
  };
}

function calculateDiscount(productPrice, salePrice) {
  if (!productPrice || !salePrice) return 0;
  return Math.round(((productPrice - salePrice) / productPrice) * 100);
}

// ==== Helpers đồng bộ với ProductSales.js ====
function normImg(raw) {
  if (!raw) return "/slide1.jpg";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const cleaned = String(raw).replace(/^\/+/, "");
  return `${API_BASE}/api/v1/storage/${cleaned.replace(/^storage\//, "")}`;
}
function toVNDC(n) {
  if (n == null) return "";
  try { return Number(n).toLocaleString("vi-VN") + "₫"; } catch { return `${n}₫`; }
}
function calcDiscountLabel(priceBuy, priceSale) {
  const buy = Number(priceBuy ?? 0);
  const sale = Number(priceSale ?? 0);
  if (!sale || sale >= buy || buy <= 0) return "";
  const pct = Math.round(((buy - sale) / buy) * 100);
  return pct > 0 ? `-${pct}%` : "";
}
function isSaleActive(s) {
  if (!s) return false;
  if (String(s.status ?? 1) !== "1") return false;
  const now = new Date();
  const b = s.date_begin ? new Date(s.date_begin) : null;
  const e = s.date_end ? new Date(s.date_end) : null;
  if (b && now < b) return false;
  if (e && now > e) return false;
  return true;
}
function normalizeProduct(p) {
  if (!p) return null;
  const sale =
    (Array.isArray(p.product_sale) ? p.product_sale[0] : p.product_sale) ||
    p.sale ||
    null;
  const activeSale = isSaleActive(sale) ? sale : null;
  const priceBuy = p.price_buy ?? p.price ?? p.price_base ?? 0;
  const priceSale = activeSale?.price_sale ?? p.price_sale ?? null;
  const thumbnail = normImg(p.image_url || p.thumbnail || p.image || "/slide1.jpg");
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    thumbnail,
    price_buy: Number(priceBuy || 0),
    price_sale: priceSale != null ? Number(priceSale) : null,
    status: p.status ?? 1,
  };
}
function normalizeFromProductSaleRow(row) {
  if (!row) return null;
  if (!row.product) {
    return {
      id: row.product_id,
      name: row.name || `SP #${row.product_id}`,
      slug: "",
      thumbnail: "/slide1.jpg",
      price_buy: 0,
      price_sale: Number(row.price_sale ?? 0),
      status: 1,
    };
  }
  const base = row.product;
  const p = normalizeProduct(base);
  if (!p) return null;
  const price_sale = row.price_sale != null ? Number(row.price_sale) : p.price_sale;
  return { ...p, price_sale };
}

/** ====== Main Component ====== */
export default function SaleProductsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [priceKeys, setPriceKeys] = useState([]);
  const [categories, setCategories] = useState([]);
  const [facetCounts, setFacetCounts] = useState({});

  useEffect(() => {
    loadData();
  }, [filterStatus, search, category, priceKeys]);

  const toggleMulti = (val, list, setter) => {
    setter(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  };

  async function loadData() {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      params.set("per_page", "200");
      params.set("active", "true");
      params.set("status", "1");
      if (search) params.set("q", search);

      const response = await fetch(`${API_BASE}/api/v1/product-sale?${params}`, {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      
      const data = await response.json();
      let sales = Array.isArray(data?.data) ? data.data : [];

      // Fallback: nếu không còn active theo thời gian hiện tại, lấy sale status=1 gần nhất.
      if (!sales.length) {
        const fbParams = new URLSearchParams();
        fbParams.set("per_page", "200");
        fbParams.set("status", "1");
        if (search) fbParams.set("q", search);
        const fbRes = await fetch(`${API_BASE}/api/v1/product-sale?${fbParams}`, {
          cache: "no-store",
          headers: { Accept: "application/json" }
        });
        const fbData = await fbRes.json();
        sales = Array.isArray(fbData?.data) ? fbData.data : [];
      }

      // Chỉ giữ các sale có product info + status hợp lệ
      const now = new Date();
      const allValidSales = sales.filter((s) => !!s.product && Number(s.status) === 1);
      
      // Tính categories từ TẤT CẢ sản phẩm đang SALE (trước khi lọc)
      const categoriesWithSale = {};
      allValidSales.forEach(sale => {
        const product = sale.product;
        if (product && product.category) {
          const cat = product.category;
          if (!categoriesWithSale[cat.slug]) {
            categoriesWithSale[cat.slug] = {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              count: 0
            };
          }
          categoriesWithSale[cat.slug].count++;
        }
      });
      
      const catList = Object.values(categoriesWithSale);
      setCategories(catList);
      
      // Tính tổng số sản phẩm sale
      const counts = {};
      catList.forEach((c) => {
        counts[c.slug] = c.count;
      });
      setFacetCounts(counts);
      
      // Bây giờ mới lọc validSales
      let validSales = allValidSales;

      // Lọc theo trạng thái chương trình sale
      if (filterStatus !== "all") {
        validSales = validSales.filter((s) => {
          const begin = new Date(s.date_begin);
          const end = new Date(s.date_end);
          const isActive = now >= begin && now <= end;
          const isUpcoming = now < begin;
          const isEnded = now > end;
          if (filterStatus === "active") return isActive;
          if (filterStatus === "upcoming") return isUpcoming;
          if (filterStatus === "ended") return isEnded;
          return true;
        });
      }
      
      // Lọc theo category
      if (category) {
        validSales = validSales.filter(s => 
          s.product?.category?.slug === category
        );
      }
      
      // Lọc theo giá
      if (priceKeys.length > 0) {
        validSales = validSales.filter(sale => {
          const salePrice = sale.price_sale;
          return priceKeys.some(key => {
            const bucket = PRICE_BUCKETS.find(b => b.key === key);
            return bucket && salePrice >= bucket.min && salePrice <= bucket.max;
          });
        });
      }
      
      setItems(validSales);
    } catch (e) {
      setErr(e?.message || "Không tải được dữ liệu");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const activeSales = items.filter(s => {
    const now = new Date();
    const begin = new Date(s.date_begin);
    const end = new Date(s.date_end);
    return s.status === 1 && now >= begin && now <= end;
  });

  const upcomingSales = items.filter(s => {
    const now = new Date();
    const begin = new Date(s.date_begin);
    return now < begin && s.status === 1;
  });

  const endedSales = items.filter(s => {
    const now = new Date();
    const end = new Date(s.date_end);
    return now > end;
  });

  const hasSale = useMemo(() => items.length > 0, [items]);

  // Card đồng bộ giao diện với ProductSales.js
  const Card = ({ prod }) => {
    const [adding, setAdding] = useState(false);
    const priceBuy = prod.price_buy ?? 0;
    const priceSale = prod.price_sale ?? null;
    const discountLabel = calcDiscountLabel(priceBuy, priceSale);
    const productHref = `/product/${prod.slug || prod.id}`;

    const handleCartClick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setAdding(true);
      try {
        const cart = JSON.parse(localStorage.getItem("cart") || "{}");
        if (!cart.items) cart.items = [];
        const existingItem = cart.items.find(item => item.product_id === prod.id);
        if (existingItem) {
          existingItem.qty += 1;
        } else {
          cart.items.push({
            product_id: prod.id,
            name: prod.name,
            price: priceSale && priceSale < priceBuy ? priceSale : priceBuy,
            qty: 1,
            thumb: prod.thumbnail,
          });
        }
        localStorage.setItem("cart", JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent("cart-updated"));
        alert("✅ Đã thêm vào giỏ hàng!");
      } catch {
        alert("Có lỗi xảy ra");
      } finally {
        setAdding(false);
      }
    };

    return (
      <div className="group bg-white rounded-lg shadow-sm hover:shadow-lg overflow-hidden transition-all duration-300 relative border border-gray-100 flex flex-col h-full">
        <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
          <Link href={productHref}>
            <img
              src={normImg(prod.thumbnail || "/slide1.jpg")}
              alt={`Hình ảnh của ${prod.name}`}
              title={prod.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const el = e.currentTarget;
                if (el.dataset.fallback === "1") return;
                el.dataset.fallback = "1";
                el.src = "/slide1.jpg";
              }}
            />
          </Link>
          {discountLabel && (
            <div className="absolute top-2 left-2 z-10">
              <span className="px-2 py-1 rounded-md text-xs font-bold bg-amber-600 text-white shadow">
                {discountLabel}
              </span>
            </div>
          )}
          <div className="absolute top-2 right-2 z-10">
            <FavoriteButton
              productId={prod.id}
              className="bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:scale-110 transition-transform shadow-sm"
            />
          </div>
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
              href={productHref}
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
          <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2" title={prod.name}>
            {prod.name}
          </h3>
          <div className="mt-auto">
            {priceSale && priceSale < priceBuy && (
              <del className="text-sm text-gray-400 mr-2">{toVNDC(priceBuy)}</del>
            )}
            <span className="text-lg font-bold text-amber-600">
              {priceSale && priceSale < priceBuy ? toVNDC(priceSale) : toVNDC(priceBuy)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Category Cards Banner - giống trang /product */}
      <CategoryCards />
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8 anim-fade-in">
      <h1 className="text-3xl font-serif font-extrabold text-center mb-3">
        🔥 Sản phẩm khuyến mãi
      </h1>
      <p className="text-center text-amber-700 mb-6">
        Những ưu đãi đặc biệt đang chờ bạn! ⏰ {activeSales.length} chương trình đang diễn ra
      </p>

      {/* Sắp xếp + tìm kiếm */}
      <div className="mb-5 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-700 mr-1">Lọc:</span>
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded border text-sm ${
              filterStatus === "all"
                ? "bg-amber-500 text-white border-amber-500"
                : "hover:bg-gray-50"
            }`}
          >
            Tất cả ({items.length})
          </button>
          <button
            onClick={() => setFilterStatus("active")}
            className={`px-3 py-1.5 rounded border text-sm ${
              filterStatus === "active"
                ? "bg-amber-500 text-white border-amber-500"
                : "hover:bg-gray-50"
            }`}
          >
            Đang diễn ra ({activeSales.length})
          </button>
          <button
            onClick={() => setFilterStatus("ended")}
            className={`px-3 py-1.5 rounded border text-sm ${
              filterStatus === "ended"
                ? "bg-amber-500 text-white border-amber-500"
                : "hover:bg-gray-50"
            }`}
          >
            Đã kết thúc ({endedSales.length})
          </button>
        </div>

        {/* Search box */}
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm sản phẩm…"
            className="h-9 rounded border px-3 text-sm"
          />
          <button
            onClick={() => loadData()}
            className="h-9 px-4 rounded bg-amber-500 text-white text-sm hover:bg-amber-600"
          >
            Lọc
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 space-y-4">
          {/* Danh mục có SALE */}
          <section className="rounded-xl border bg-amber-50">
            <h3 className="px-4 py-2.5 font-semibold bg-amber-600 text-white rounded-t-xl">
              Danh mục đang Sale 🔥
            </h3>
            {categories.length === 0 ? (
              <div className="p-3 text-center">
                <p className="text-sm text-gray-600">Chưa có danh mục nào đang sale</p>
              </div>
            ) : (
              <ul className="p-3 space-y-1">
                <li>
                  <button
                    onClick={() => setCategory("")}
                    className={`w-full flex justify-between px-2 py-1.5 rounded ${
                      category === "" ? "bg-amber-100 font-semibold" : "hover:bg-amber-100"
                    }`}
                  >
                    <span>Tất cả</span>
                    <span className="text-xs opacity-70">{items.length}</span>
                  </button>
                </li>
                {categories.map((c) => (
                  <li key={c.slug}>
                    <button
                      onClick={() => setCategory(c.slug)}
                      className={`w-full flex justify-between px-2 py-1.5 rounded ${
                        category === c.slug ? "bg-amber-100 font-semibold" : "hover:bg-amber-100"
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="text-xs opacity-70">{c.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Mức giá */}
          <section className="rounded-xl border bg-amber-50">
            <h3 className="px-4 py-2.5 font-semibold bg-amber-600 text-white rounded-t-xl">
              Mức giá Sale
            </h3>
            <div className="p-3 space-y-2">
              {PRICE_BUCKETS.map((b) => {
                const count = items.filter(item => {
                  const price = item.price_sale;
                  return price >= b.min && price <= b.max;
                }).length;
                
                return (
                  <label key={b.key} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={priceKeys.includes(b.key)}
                        onChange={() => toggleMulti(b.key, priceKeys, setPriceKeys)}
                      />
                      {b.label}
                    </div>
                    {count > 0 && (
                      <span className="text-xs text-amber-600">({count})</span>
                    )}
                  </label>
                );
              })}
            </div>
          </section>

        </aside>

        {/* Products */}
        <section className="col-span-12 md:col-span-9">

      {loading ? (
        <>
          <div className="mb-3 h-4 w-48 skeleton rounded"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow overflow-hidden">
                <div className="h-40 skeleton"></div>
                <div className="p-3 space-y-2">
                  <div className="h-4 w-5/6 skeleton rounded"></div>
                  <div className="h-4 w-2/3 skeleton rounded"></div>
                  <div className="h-5 w-1/2 skeleton rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : err ? (
        <p className="text-red-600 text-center anim-up">{err}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((sale) => {
            const prod = normalizeFromProductSaleRow(sale);
            if (!prod) return null;
            return (
              <div key={`sale-${sale.id}`}>
                <Card prod={prod} />
              </div>
            );
          })}
        </div>
      )}
        </section>
      </div>
      </main>
    </>
  );
}

