"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FavoriteButton from "./FavoriteButton";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

/* ===== helpers ===== */
function normImg(raw) {
  if (!raw) return "/slide1.jpg";
  // Keep absolute URLs
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  // Convert any relative or /storage/... path to API storage endpoint
  const cleaned = String(raw).replace(/^\/+/, "");
  return `${API_BASE}/api/v1/storage/${cleaned.replace(/^storage\//, "")}`;
}
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
  const thumbnail = normImg(p.image_url || p.thumbnail || p.image || "/slide1.jpg");

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    thumbnail: thumbnail,
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
  const price_sale =
    row.price_sale != null ? Number(row.price_sale) : p.price_sale;
  return { ...p, price_sale };
}

/* ===== API helpers ===== */
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
export default function ProductSale() {
  const [saleItems, setSaleItems] = useState([]);
  const [newItems, setNewItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadSales() {
      setLoading(true);
      setErr("");

      try {
        // Ưu tiên danh sách sale đang active.
        const activeRes = await fetch(
          `${API_BASE}/api/v1/product-sale?active=true&status=1&per_page=12`,
          { cache: "no-store", headers: { Accept: "application/json" } }
        );
        const activeJson = activeRes.ok ? await activeRes.json() : { data: [] };
        const activeRowsRaw = Array.isArray(activeJson?.data) ? activeJson.data : [];
        const activeRows = activeRowsRaw.filter(isSaleActive);

        // Fallback cho dữ liệu demo/seed cũ: nếu không còn active thì lấy sale gần nhất.
        let saleRows = activeRows;
        if (!saleRows.length) {
          const fallbackRes = await fetch(
            `${API_BASE}/api/v1/product-sale?status=1&per_page=24`,
            { cache: "no-store", headers: { Accept: "application/json" } }
          );
          const fallbackJson = fallbackRes.ok ? await fallbackRes.json() : { data: [] };
          const fallbackRowsRaw = Array.isArray(fallbackJson?.data) ? fallbackJson.data : [];
          saleRows = fallbackRowsRaw;
        }

        // Chuẩn hoá từ bảng product_sale
        const saleItemsNormalized = saleRows
          .map(normalizeFromProductSaleRow)
          .filter(Boolean)
          .filter((p) => p.status == 1)
          .filter((p) => p.price_buy > 0 && p.price_sale != null && p.price_sale < p.price_buy)
          .slice(0, 12);

        // Không bắt buộc phần sản phẩm mới ở đây
        const newNorm = [];

        if (!alive) return;
        setSaleItems(saleItemsNormalized);
        setNewItems(newNorm);
        setLoading(false);
      } catch (e) {
        if (alive) {
          setErr(e?.message || "Fetch error");
          setLoading(false);
        }
      }
    }

    // Tải lần đầu
    loadSales();

    // Tự động làm mới theo đồng hồ: mỗi 60s
    const intervalId = setInterval(() => {
      loadSales();
    }, 60000);

    // Làm mới khi tab quay lại focus
    const onFocus = () => loadSales();
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") onFocus();
      });
    }

    return () => {
      alive = false;
      clearInterval(intervalId);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onFocus);
      }
    };
  }, []);

  const hasSale = useMemo(() => saleItems.length > 0, [saleItems]);
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
            price: priceSale && priceSale < priceBuy ? priceSale : priceBuy,
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
          
          {/* Discount badge - Top Left */}
          {discountLabel && (
            <div className="absolute top-2 left-2 z-10">
              <span className="px-2 py-1 rounded-md text-xs font-bold bg-amber-600 text-white shadow">
                {discountLabel}
              </span>
            </div>
          )}
          
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
        id="products-sale"
        className="mb-10 py-8 bg-white border-y border-amber-200"
        aria-label="Bánh đang giảm giá"
      >
        <div className="max-w-7xl mx-auto px-4">
          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
              Bánh đang giảm giá
            </h2>
            <p className="text-sm text-gray-600">Dùng bột thúc đẩy - Hẹn gặp lại trong thời gian tới</p>
          </div>

          {/* Products - Horizontal scrollable */}
          {hasSale ? (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4" role="list" style={{ width: 'max-content' }}>
                {saleItems.slice(0, 8).map((p) => (
                  <div key={`sale-${p.id}`} style={{ width: '240px', flexShrink: 0 }}>
                    <Card prod={p} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-12">
              Hiện chưa có sản phẩm giảm giá.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
