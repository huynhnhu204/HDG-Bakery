"use client";

import { useEffect, useMemo, useState, useCallback, memo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import FavoriteButton from "@/components/FavoriteButton";

/* ========= Config ========= */
const RAW_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:8000");

const BASE_API = `${RAW_BASE}/api/v1`;
const PAGE_SIZE = 24;

/* ========= Sắp xếp ========= */
const SORT_MAP = {
  newest: "created_desc",
  az: "name_asc",
  za: "name_desc",
  price_asc: "price_asc",
  price_desc: "price_desc",
  sale: "discount_desc",
};

// ProductCard component
const ProductCard = memo(({ product: p, index, addingIds, setAddingIds, calcDiscount }) => {
  const discount = useMemo(() => calcDiscount(p), [p, calcDiscount]);
  const price = useMemo(() => p.price_sale && p.price_sale < p.price_buy ? p.price_sale : p.price_buy, [p]);
  const old = useMemo(() => p.price_sale && p.price_sale < p.price_buy ? p.price_buy : null, [p]);
  const hasValidPrice = price > 0;
  const showOldPrice = old && old > 0 && price < old;
  const adding = addingIds.has(p.id);
  
  const img = useMemo(() => {
    let imageUrl = p.thumbnail || p.image || "/logo.png";
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
          
          {p.product_new && (
            <span className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded z-10">
              New
            </span>
          )}
          
        <div className={`absolute top-2 right-2 z-10 ${p.product_new ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}>
          <FavoriteButton 
            productId={p.id} 
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
                <span className="text-lg font-bold text-red-600">
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
});

ProductCard.displayName = "ProductCard";

function calcDiscount(product) {
  if (!product.price_buy || product.price_buy <= 0) return 0;
  const priceSale = product.price_sale || product.price_buy;
  if (priceSale >= product.price_buy) return 0;
  return Math.round(((product.price_buy - priceSale) / product.price_buy) * 100);
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initial = useMemo(() => {
    const sp = searchParams;
    return {
      page: Math.max(1, Number(sp.get("page") || 1)),
      sort: sp.get("sort") || "newest",
      q: sp.get("q") || "",
    };
  }, [searchParams]);

  const [page, setPage] = useState(initial.page);
  const [sort, setSort] = useState(initial.sort);
  const [q, setQ] = useState(initial.q);
  const [activeTab, setActiveTab] = useState("products"); // "products" or "news"

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addingIds, setAddingIds] = useState(new Set());
  
  // Ref để track xem có đang update từ user interaction không
  const isUpdatingFromUser = useRef(false);

  const apiUrl = useMemo(() => {
    const u = new URL(`${BASE_API}/products`);
    u.searchParams.set("status", "1");
    u.searchParams.set("page", String(page));
    u.searchParams.set("per_page", String(PAGE_SIZE));
    if (q) u.searchParams.set("q", q);
    u.searchParams.set("sort", SORT_MAP[sort] || "created_desc");
    return u.toString();
  }, [page, q, sort]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetch(apiUrl, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        setItems(data?.data || []);
        setTotal(data?.total || 0);
        setTotalPages(data?.last_page || 1);
      })
      .catch((err) => {
        console.error("Search error:", err);
        if (mounted) {
          setItems([]);
          setTotal(0);
          setTotalPages(1);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [apiUrl]);

  // Update URL khi state thay đổi (từ user interaction)
  const updateURL = useCallback((newQ, newPage, newSort) => {
    isUpdatingFromUser.current = true; // Đánh dấu đang update từ user
    const params = new URLSearchParams();
    if (newQ) params.set("q", newQ);
    if (newPage > 1) params.set("page", String(newPage));
    if (newSort !== "newest") params.set("sort", newSort);
    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router]);

  // Sync từ URL khi URL thay đổi từ bên ngoài (browser back/forward)
  useEffect(() => {
    // Nếu đang update từ user interaction, bỏ qua sync này
    if (isUpdatingFromUser.current) {
      isUpdatingFromUser.current = false;
      return;
    }
    
    const urlQ = searchParams.get("q") || "";
    const urlPage = Math.max(1, Number(searchParams.get("page") || 1));
    const urlSort = searchParams.get("sort") || "newest";
    
    // Chỉ update nếu khác với state hiện tại
    if (urlQ !== q) setQ(urlQ);
    if (urlPage !== page) setPage(urlPage);
    if (urlSort !== sort) setSort(urlSort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <main className="container mx-auto px-4 py-8 min-h-screen">
      {/* Tabs */}
      <div className="mb-6 flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "products"
              ? "border-amber-500 text-amber-600 bg-amber-50"
              : "border-transparent text-gray-600 hover:text-amber-600"
          }`}
        >
          Sản phẩm
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("news")}
          className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "news"
              ? "border-amber-500 text-amber-600 bg-amber-50"
              : "border-transparent text-gray-600 hover:text-amber-600"
          }`}
        >
          Tin tức
        </button>
      </div>

      {/* Header với số kết quả và sắp xếp */}
      {activeTab === "products" && q && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-gray-600">
            {loading ? "Đang tìm kiếm..." : `Có ${total} kết quả tìm kiếm phù hợp`}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sắp xếp:</span>
            <select
              value={sort}
              onChange={(e) => {
                const newSort = e.target.value;
                setSort(newSort);
                setPage(1);
                updateURL(q, 1, newSort);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="newest">Mới nhất</option>
              <option value="az">A - Z</option>
              <option value="za">Z - A</option>
              <option value="price_asc">Giá: Thấp → Cao</option>
              <option value="price_desc">Giá: Cao → Thấp</option>
              <option value="sale">Giảm giá nhiều</option>
            </select>
          </div>
        </div>
      )}

      {activeTab === "news" && (
        <div className="mb-6">
          <p className="text-gray-600">Tính năng tìm kiếm tin tức đang được phát triển</p>
        </div>
      )}

      {!q && (
        <div className="mb-6">
          <p className="text-gray-600">Nhập từ khóa để bắt đầu tìm kiếm sản phẩm.</p>
        </div>
      )}

      {/* Loading */}
      {activeTab === "products" && loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      )}

      {/* No Results */}
      {activeTab === "products" && !loading && q && items.length === 0 && (
        <div className="bg-white border rounded-xl p-8 text-center">
          <p className="text-gray-600 text-lg mb-2">
            Không tìm thấy sản phẩm nào cho &ldquo;{q}&rdquo;
          </p>
          <p className="text-gray-500 text-sm">Hãy thử từ khóa khác hoặc tìm kiếm với từ khóa ngắn hơn.</p>
        </div>
      )}

      {/* No Query */}
      {activeTab === "products" && !loading && !q && (
        <div className="bg-white border rounded-xl p-8 text-center">
          <p className="text-gray-600">Vui lòng nhập từ khóa để tìm kiếm sản phẩm.</p>
        </div>
      )}

      {/* Products Grid */}
      {activeTab === "products" && !loading && q && items.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 mb-8">
            {items.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                addingIds={addingIds}
                setAddingIds={setAddingIds}
                calcDiscount={calcDiscount}
              />
            ))}
          </div>

          {/* Pagination với số trang */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  setPage(newPage);
                  updateURL(q, newPage, sort);
                }}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Trước
              </button>
              
              {/* Số trang */}
              <div className="flex items-center gap-1">
                {(() => {
                  const pages = [];
                  const maxVisible = 7;
                  
                  if (totalPages <= maxVisible) {
                    // Hiển thị tất cả các trang nếu <= 7
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    // Logic hiển thị trang thông minh
                    if (page <= 3) {
                      // Hiển thị 1-5 và ... và trang cuối
                      for (let i = 1; i <= 5; i++) {
                        pages.push(i);
                      }
                      if (totalPages > 6) {
                        pages.push('...');
                        pages.push(totalPages);
                      }
                    } else if (page >= totalPages - 2) {
                      // Hiển thị trang đầu, ... và 3 trang cuối
                      pages.push(1);
                      if (totalPages > 5) {
                        pages.push('...');
                      }
                      for (let i = totalPages - 4; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Hiển thị trang đầu, ..., 3 trang giữa, ..., trang cuối
                      pages.push(1);
                      pages.push('...');
                      for (let i = page - 1; i <= page + 1; i++) {
                        pages.push(i);
                      }
                      pages.push('...');
                      pages.push(totalPages);
                    }
                  }
                  
                  return pages.map((pageNum, idx) => {
                    if (pageNum === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => {
                          setPage(pageNum);
                          updateURL(q, pageNum, sort);
                        }}
                        className={`px-3 py-2 min-w-[40px] text-sm rounded-lg transition-colors ${
                          page === pageNum
                            ? "bg-amber-500 text-white font-semibold"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  });
                })()}
              </div>

              <button
                onClick={() => {
                  const newPage = Math.min(totalPages, page + 1);
                  setPage(newPage);
                  updateURL(q, newPage, sort);
                }}
                disabled={page >= totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Tiếp
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
