"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getLocalFavorites, isLoggedIn } from "@/utils/favoritesService";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const TOKEN_KEY = "auth_token";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    loadFavorites();
    
    // Lắng nghe sự kiện favorite-updated để reload
    const handleFavoriteUpdated = () => {
      loadFavorites();
    };
    window.addEventListener("favorite-updated", handleFavoriteUpdated);
    window.addEventListener("auth-changed", handleFavoriteUpdated);
    window.addEventListener("storage", handleFavoriteUpdated);
    
    return () => {
      window.removeEventListener("favorite-updated", handleFavoriteUpdated);
      window.removeEventListener("auth-changed", handleFavoriteUpdated);
      window.removeEventListener("storage", handleFavoriteUpdated);
    };
  }, []);

  async function loadFavorites() {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const loggedIn = isLoggedIn();
      
      if (!loggedIn || !token) {
        // Chưa đăng nhập: lấy từ localStorage
        const localFavorites = getLocalFavorites();
        if (localFavorites.length > 0) {
          // Load product details từ API
          const productPromises = localFavorites.map((productId) =>
            fetch(`${API_BASE}/api/v1/products/${productId}`)
              .then((res) => res.json())
              .catch(() => null)
          );
          
          const products = await Promise.all(productPromises);
          const validProducts = products.filter((p) => p && p.id);
          
          setFavorites(validProducts.map((p) => ({ product: p, id: `local-${p.id}` })));
          setIsLocal(true);
        } else {
          setFavorites([]);
          setIsLocal(true);
        }
        setLoading(false);
        return;
      }

      // Đã đăng nhập: lấy từ server
      const res = await fetch(`${API_BASE}/api/v1/favorites`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Không thể tải danh sách yêu thích");
      }

      const data = await res.json();
      setFavorites(data?.data || []);
      setIsLocal(false);
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra");
      // Fallback về localStorage nếu server lỗi
      try {
        const localFavorites = getLocalFavorites();
        if (localFavorites.length > 0) {
          const productPromises = localFavorites.map((productId) =>
            fetch(`${API_BASE}/api/v1/products/${productId}`)
              .then((res) => res.json())
              .catch(() => null)
          );
          const products = await Promise.all(productPromises);
          const validProducts = products.filter((p) => p && p.id);
          setFavorites(validProducts.map((p) => ({ product: p, id: `local-${p.id}` })));
          setIsLocal(true);
        }
      } catch (e) {
        console.error("Error loading local favorites:", e);
      }
    } finally {
      setLoading(false);
    }
  }

  function formatVND(price, oldPrice = null) {
    if (price == null || isNaN(Number(price))) return "Liên hệ";
    return Math.round(Number(price)).toLocaleString("vi-VN") + " đ";
  }

  function getImage(product) {
    if (!product.thumbnail && !product.image) return "/logo.png";
    let img = product.thumbnail || product.image;
    if (img && !img.startsWith("http")) {
      img = `${API_BASE}/api/v1/storage/${String(img).replace(/^storage\//, "")}`;
    }
    return img;
  }

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-extrabold text-amber-600 mb-6">Yêu thích</h1>
        <p className="text-gray-600">Đang tải...</p>
      </main>
    );
  }

  if (error && favorites.length === 0 && isLoggedIn()) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-extrabold text-amber-600 mb-6">Yêu thích</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-gray-700 mb-4">{error}</p>
          {!isLoggedIn() && (
            <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
              Đăng nhập ngay
            </Link>
          )}
        </div>
      </main>
    );
  }

  if (favorites.length === 0) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">❤️</div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-4">Danh sách yêu thích</h1>
          <p className="text-gray-600 mb-6">
            {isLocal
              ? "Bạn chưa lưu sản phẩm nào. Đăng nhập để đồng bộ yêu thích trên mọi thiết bị."
              : "Bạn chưa lưu sản phẩm nào vào danh sách yêu thích"}
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/product" className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold">
              Khám phá sản phẩm
            </Link>
            {isLocal && !isLoggedIn() && (
              <Link href="/login?next=/favorites" className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-amber-600 text-amber-600 rounded-lg hover:bg-amber-50 font-semibold">
                Đăng nhập để đồng bộ
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-amber-600">
          Danh sách yêu thích ({favorites.length})
        </h1>
        {isLocal && !isLoggedIn() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800">
            💡 Đăng nhập để đồng bộ yêu thích
          </div>
        )}
      </div>

      <section className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {favorites.map((fav) => {
          const p = fav.product || fav;
          const price = p.price_sale && p.price_sale < p.price_buy ? p.price_sale : p.price_buy;
          const oldPrice = p.price_sale && p.price_sale < p.price_buy ? p.price_buy : null;

          return (
            <article
              key={fav.id}
              className="bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden group"
            >
              <Link href={`/product/${p.slug || p.id}`} className="block">
                <div className="relative w-full h-48">
                  <img
                    src={getImage(p)}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = "/logo.png";
                    }}
                  />
                  {oldPrice && (
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                      -{Math.round(100 - (price / oldPrice) * 100)}%
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-semibold text-lg text-gray-900 line-clamp-2">{p.name}</h2>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      {oldPrice && (
                        <del className="text-xs text-gray-400 block">{Math.round(oldPrice).toLocaleString("vi-VN")} đ</del>
                      )}
                      <span className="text-amber-600 font-bold">
                        {price > 0 ? Math.round(price).toLocaleString("vi-VN") + " đ" : "Liên hệ"}
                      </span>
                    </div>
                    <span className="text-sm text-amber-500 group-hover:underline">
                      Xem →
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </section>
    </main>
  );
}
