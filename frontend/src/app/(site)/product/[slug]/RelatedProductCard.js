"use client";
import Link from "next/link";
import { useState } from "react";
import FavoriteButton from "@/components/FavoriteButton";

function toVNDC(n) {
  if (n == null) return "";
  try {
    return Number(n).toLocaleString("vi-VN") + "₫";
  } catch {
    return `${n}₫`;
  }
}

export default function RelatedProductCard({ product }) {
  const [adding, setAdding] = useState(false);
  const priceBuy = product.price_buy ?? 0;
  const priceSale = product.price_sale ?? null;
  const productHref = `/product/${product.slug || product.id}`;
  const thumbnail = product.thumbnail || product.image || "/slide1.jpg";

  const handleCartClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "{}");
      if (!cart.items) cart.items = [];

      const existingItem = cart.items.find(item => item.product_id === product.id);
      if (existingItem) {
        existingItem.qty += 1;
      } else {
        cart.items.push({
          product_id: product.id,
          name: product.name,
          price: priceSale && priceSale < priceBuy ? priceSale : priceBuy,
          qty: 1,
          thumb: thumbnail,
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
            src={thumbnail}
            alt={`Hình ảnh của ${product.name}`}
            title={product.name}
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

        <div className="absolute top-2 right-2 z-10">
          <FavoriteButton
            productId={product.id}
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
        <h3
          className="text-base font-bold text-gray-900 mb-2 line-clamp-2"
          title={product.name}
        >
          {product.name}
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
}
