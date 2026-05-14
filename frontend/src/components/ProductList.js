"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, ShoppingBag } from "lucide-react";
import FavoriteButton from "./FavoriteButton";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

/* ===== helpers ===== */
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
  };
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
/* ===== Component ===== */
export default function ProductList() {
  const [newItems, setNewItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");

      try {
        const plain = await safeFetch(
          `${API_BASE}/api/v1/products?status=1&per_page=12`
        );
        const newest = await safeFetch(
          `${API_BASE}/api/v1/products-new?status=1&limit=12`
        );
        const newNorm = newest.map(normalizeProduct).filter(Boolean);

        if (!alive) return;
        setNewItems(newNorm);
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

  const hasNew = useMemo(() => newItems.length > 0, [newItems]);

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
            price: priceSale < priceBuy ? priceSale : priceBuy,
            qty: 1,
            thumb: prod.thumbnail,
          });
        }
        
        localStorage.setItem("cart", JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent("cart-updated"));
        alert("✅ Đã thêm vào giỏ hàng!");
      } catch (err) {
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
              src={prod.thumbnail || "/slide1.jpg"}
              alt={`Hình ảnh của ${prod.name}`}
              title={prod.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                const el = e.currentTarget;
                if (el.dataset.fallback === "1") return;
                el.dataset.fallback = "1";
                el.src = "/slide1.jpg";
              }}
            />
          </Link>
          
          {/* Heart icon - Top Right */}
          <div className="absolute top-2 right-2 z-10">
            <FavoriteButton 
              productId={prod.id} 
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
              aria-label={adding ? `Đang thêm ${prod.name} vào giỏ hàng` : `Thêm ${prod.name} vào giỏ hàng`}
            >
              {adding ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <Link
              href={productHref}
              className="bg-white/95 backdrop-blur-md text-amber-700 rounded-full p-3 hover:bg-amber-700 hover:text-white transition-all duration-300 hover:scale-110 shadow-xl"
              title="Xem chi tiết"
              aria-label={`Xem chi tiết sản phẩm ${prod.name}`}
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3
            className="text-base font-bold text-gray-900 mb-2 line-clamp-2"
            title={prod.name}
          >
            {prod.name}
          </h3>
          <div className="mt-auto">
            {priceSale && priceSale < priceBuy && (
              <del className="text-sm text-gray-400 mr-2">
                {toVNDC(priceBuy)}
              </del>
            )}
            <span className="text-lg font-bold text-amber-600">
              {priceSale && priceSale < priceBuy ? toVNDC(priceSale) : toVNDC(priceBuy)}
            </span>
          </div>
        </div>
      </div>
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
        id="products-popular"
        className="mb-10 py-8 bg-white border-y border-amber-200"
        aria-label="Được mua nhiều nhất"
      >
        <div className="max-w-7xl mx-auto px-4">
          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
              Được mua nhiều nhất
            </h2>
          </div>

          {/* Products Grid - 4 columns */}
          {hasNew ? (
            <div
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4"
              role="list"
            >
              {newItems.slice(0, 10).map((p) => (
                <Card key={`new-${p.id}`} prod={p} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-12">Chưa có sản phẩm.</p>
          )}
        </div>
      </section>
    </>
  );
}
