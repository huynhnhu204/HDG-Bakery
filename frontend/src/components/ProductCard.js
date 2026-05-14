"use client";
import { useState } from "react";
import FavoriteButton from "./FavoriteButton";
import Toast from "./Toast";
import { addToCart } from "@/lib/cart";

export default function ProductCard({ p }) {
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);
  const hasSale = p.oldPrice && p.oldPrice > p.price;

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const formatPrice = (price) => `${Number(price).toLocaleString("vi-VN")}đ`;

  const handleCartClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setAdding(true);
    try {
      const payload = {
        product_id: p.id,
        name: p.name,
        price: p.price,
        price_sale: p.oldPrice && p.oldPrice > p.price ? p.price : undefined,
        qty: 1,
        image: p.image,
      };
      await addToCart(payload);
      window.dispatchEvent(new Event("cart-updated"));
      showToast("Đã thêm vào giỏ hàng!", "success");
    } catch (err) {
      console.error("Add to cart error:", err);
      showToast("Có lỗi xảy ra. Vui lòng thử lại.", "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <article className="relative bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full">
      <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
        <img
          src={p.image}
          alt={p.name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
        
        {/* Heart icon - Top Right */}
        <div className="absolute top-2 right-2 z-10">
          <FavoriteButton 
            productId={p.id} 
            className="bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:scale-110 transition-transform shadow-sm"
            showToast={showToast}
          />
        </div>
        
        {/* Two action buttons - Bottom Center (always visible) */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          <button
            onClick={handleCartClick}
            disabled={adding}
            className="bg-amber-700/90 backdrop-blur-sm text-white rounded-full p-2.5 hover:bg-amber-800/90 transition-all hover:scale-110 shadow-lg disabled:opacity-50"
            aria-label="Thêm vào giỏ hàng"
            title="Thêm vào giỏ hàng"
          >
            {adding ? (
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="white">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16l-2 12H6L4 4zm8 15a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            )}
          </button>
          <a
            href={`/product/${p.slug || p.id}`}
            className="bg-amber-700/90 backdrop-blur-sm text-white rounded-full p-2.5 hover:bg-amber-800/90 transition-all hover:scale-110 shadow-lg"
            aria-label="Xem chi tiết"
            title="Xem chi tiết"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </a>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-base font-bold text-gray-900 line-clamp-2 mb-2">
          {p.name}
        </h3>
        <div className="mt-auto">
          {p.oldPrice && (
            <del className="text-sm text-gray-400 mr-2">{formatPrice(p.oldPrice)}</del>
          )}
          <span className="text-lg font-bold text-amber-600">
            {formatPrice(p.price)}
          </span>
        </div>
      </div>
    </article>
    </>
  );
}

// CSS Animation
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`;

if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}