"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import SiteMenu from "@/components/SiteMenu";

const TOKEN_KEY = "auth_token";
const PROFILE_KEY = "dola_profile";
const API_BASE = "http://127.0.0.1:8000"; // đổi nếu khác
const RAW_BASE = API_BASE;

// Cache cho search API
const searchCache = new Map();
const SEARCH_CACHE_TTL = 60000; // 60 seconds - tăng thời gian cache
const pendingRequests = new Map(); // Request deduplication

// Hàm fetch với cache, AbortController và request deduplication
async function fetchWithCache(url, options = {}) {
  const cacheKey = url;
  const cached = searchCache.get(cacheKey);
  
  // Nếu có cache và chưa hết hạn, trả về cache ngay (không cần fetch)
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
    return cached.data;
  }
  
  // Request deduplication - nếu đang có request cùng URL, dùng chung promise
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // Tạo promise mới cho request này
  const fetchPromise = (async () => {
    try {
      const res = await fetch(url, { 
        ...options, 
        cache: "no-store",
        signal: options.signal // Hỗ trợ AbortController
      });
      
      // Kiểm tra nếu request đã bị cancel
      if (options.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      
      // Cache kết quả chỉ khi request thành công
      searchCache.set(cacheKey, { data, timestamp: Date.now() });
      
      // Xóa khỏi pending requests
      pendingRequests.delete(cacheKey);
      
      return data;
    } catch (err) {
      // Xóa khỏi pending requests khi lỗi
      pendingRequests.delete(cacheKey);
      
      // Nếu request bị cancel, không dùng cache cũ
      if (err.name === 'AbortError') {
        throw err;
      }
      
      // Nếu có cache cũ và request lỗi, trả về cache cũ
      if (cached) {
        return cached.data;
      }
      throw err;
    }
  })();
  
  // Lưu promise vào pending requests
  pendingRequests.set(cacheKey, fetchPromise);
  
  return fetchPromise;
}

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function getProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch { return null; }
}
function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    window.dispatchEvent(new Event("auth-changed"));
  } catch {}
}

// Component ProductItem được memoize để tránh re-render không cần thiết
const ProductItem = memo(({ product, onClick }) => {
  return (
    <div
      onClick={() => onClick(product)}
      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors 
               border-b border-gray-100 last:border-b-0"
    >
      {/* Bên trái: Ảnh và Giá */}
      <div className="flex flex-col items-start gap-2 flex-shrink-0">
        {/* Product Image */}
        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "/logo.png";
            }}
          />
          {product.discount > 0 && (
            <span className="absolute top-1 left-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              -{product.discount}%
            </span>
          )}
        </div>
        
        {/* Giá sản phẩm - Bên dưới ảnh */}
        <div className="flex flex-col items-start gap-1">
          {product.price > 0 ? (
            <>
              {product.oldPrice && (
                <del className="text-xs text-gray-400">
                  {product.oldPrice.toLocaleString("vi-VN")}₫
                </del>
              )}
              <span className="text-sm font-bold text-red-600 whitespace-nowrap">
                {product.price.toLocaleString("vi-VN")}₫
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-500 italic">Liên hệ</span>
          )}
        </div>
      </div>

      {/* Bên phải: Tên sản phẩm */}
      <div className="flex-1 min-w-0 pt-1">
        <h4 className="text-sm font-semibold text-gray-900 line-clamp-3 leading-snug">
          {product.name}
        </h4>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison để chỉ re-render khi cần
  return prevProps.product.id === nextProps.product.id &&
         prevProps.product.price === nextProps.product.price &&
         prevProps.product.imageUrl === nextProps.product.imageUrl &&
         prevProps.product.discount === nextProps.product.discount;
});

ProductItem.displayName = "ProductItem";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Auth state
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);

  // Cart badge
  const [cartCount, setCartCount] = useState(0);

  // Search suggestions
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTab, setSearchTab] = useState("products"); // "products" or "news"
  const [popularProducts, setPopularProducts] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const searchTimeoutRef = useRef(null);
  const hasLoadedPopularRef = useRef(false);
  const abortControllerRef = useRef(null);

  const profileWrapRef = useRef(null);
  const searchRef = useRef(null);
  const inputSearchRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Khi cuộn xuống, đổi nền header (throttled)
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 8);
          ticking = false;
        });
        ticking = true;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Đọc token/profile & sync realtime
  useEffect(() => {
    const load = () => {
      setToken(getToken());
      setProfile(getProfile());
    };
    load();

    const onStorage = (e) => {
      if (e.key === TOKEN_KEY || e.key === PROFILE_KEY) load();
    };
    const onAuthChanged = () => load();

    window.addEventListener("storage", onStorage);
    window.addEventListener("auth-changed", onAuthChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-changed", onAuthChanged);
    };
  }, []);

  // 🔥 Đọc giỏ hàng & sync realtime (giữ nguyên logic cũ của bạn)
  useEffect(() => {
    const getCart = () => {
      try {
        const raw = localStorage.getItem("cart");
        if (!raw) {
          setCartCount(0);
          return;
        }
        const parsed = JSON.parse(raw);

        // Dạng mới { items: [...] }
        if (parsed?.items && Array.isArray(parsed.items)) {
          const totalQty = parsed.items.reduce((s, it) => s + (it.qty || 1), 0);
          setCartCount(totalQty);
        }
        // Dạng cũ []
        else if (Array.isArray(parsed)) {
          setCartCount(parsed.length);
        } else {
          setCartCount(0);
        }
      } catch {
        setCartCount(0);
      }
    };

    getCart();
    window.addEventListener("storage", getCart);
    window.addEventListener("cart-updated", getCart);
    return () => {
      window.removeEventListener("storage", getCart);
      window.removeEventListener("cart-updated", getCart);
    };
  }, []);

  // Click ngoài để đóng
  useEffect(() => {
    function onClickOutside(e) {
      if (profileWrapRef.current && !profileWrapRef.current.contains(e.target))
        setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
        setSearchTotal(0);
        setSearchTab("products");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Auto focus khi mở search
  useEffect(() => {
    if (searchOpen) {
      inputSearchRef.current?.focus();
    } else {
      // Reset search khi đóng
      setSearchQuery("");
      setSearchResults([]);
      setSearchTotal(0);
      setSearchTab("products");
      setPopularProducts([]);
      hasLoadedPopularRef.current = false; // Reset flag để load lại lần sau
    }
  }, [searchOpen]);

  // Load sản phẩm phổ biến khi mở search (chỉ load một lần khi mở)
  useEffect(() => {
    if (!searchOpen || searchTab !== "products" || hasLoadedPopularRef.current) return;
    
    hasLoadedPopularRef.current = true;
    setLoadingPopular(true);
    
    // Sử dụng cache cho popular products
    const url = `${API_BASE}/api/v1/products?status=1&per_page=5&sort=created_desc`;
    fetchWithCache(url)
      .then((data) => {
        setPopularProducts(data?.data || []);
      })
      .catch((err) => {
        console.error("Error loading popular products:", err);
        setPopularProducts([]);
      })
      .finally(() => {
        setLoadingPopular(false);
      });
  }, [searchOpen, searchTab]); // Chỉ chạy khi searchOpen hoặc searchTab thay đổi

  // Search suggestions với debounce tối ưu
  useEffect(() => {
    // Cancel request trước đó nếu có
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const query = searchQuery.trim();
    
    // Nếu không có query hoặc query < 2 ký tự, không search nhưng vẫn hiển thị popular products
    if (!query || query.length < 2) {
      setSearchResults([]);
      setSearchTotal(0);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    
    // Debounce tối ưu - giảm xuống 100ms cho phản hồi nhanh nhất
    searchTimeoutRef.current = setTimeout(async () => {
      // Tạo AbortController mới cho request này
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      try {
        if (searchTab === "products") {
          const url = `${API_BASE}/api/v1/products?status=1&q=${encodeURIComponent(query)}&per_page=5`;
          
          // Sử dụng cache để tăng tốc độ
          const data = await fetchWithCache(url, { 
            signal: abortController.signal 
          });
          
          // Kiểm tra nếu request đã bị cancel
          if (abortController.signal.aborted) return;
          
          setSearchResults(data?.data || []);
          setSearchTotal(data?.total || 0);
        } else {
          // News search - có thể thêm sau
          setSearchResults([]);
          setSearchTotal(0);
        }
      } catch (err) {
        // Bỏ qua lỗi nếu request bị cancel
        if (err.name === 'AbortError') return;
        
        console.error("Search error:", err);
        if (!abortController.signal.aborted) {
          setSearchResults([]);
          setSearchTotal(0);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 100); // Debounce 100ms - tối ưu cho tốc độ

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery, searchTab]);

  // Xử lý image URL
  const getImageUrl = useCallback((product) => {
    let imageUrl = product?.thumbnail || product?.image || "/logo.png";
    if (imageUrl && !imageUrl.startsWith("http")) {
      const cleaned = imageUrl.replace(/^\/+/, "");
      imageUrl = `${RAW_BASE}/api/v1/storage/${cleaned.replace(/^storage\//, "")}`;
    }
    return imageUrl;
  }, []);

  // Xử lý giá sản phẩm
  const getProductPrice = useCallback((product) => {
    const priceBuy = product?.price_buy || 0;
    const priceSale = product?.price_sale || 0;
    const price = priceSale && priceSale < priceBuy ? priceSale : priceBuy;
    const oldPrice = priceSale && priceSale < priceBuy ? priceBuy : null;
    return { price, oldPrice };
  }, []);

  // Xử lý click vào sản phẩm
  const handleProductClick = useCallback((product) => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchTotal(0);
    setSearchTab("products");
    router.push(`/product/${product.slug || product.id}`);
  }, [router]);

  // Memoize processed products để tránh tính toán lại
  const processedSearchResults = useMemo(() => {
    return searchResults.map((product) => {
      const { price, oldPrice } = getProductPrice(product);
      const imageUrl = getImageUrl(product);
      const discount = oldPrice && price < oldPrice 
        ? Math.round(((oldPrice - price) / oldPrice) * 100) 
        : 0;
      return {
        ...product,
        price,
        oldPrice,
        imageUrl,
        discount
      };
    });
  }, [searchResults, getProductPrice, getImageUrl]);

  const processedPopularProducts = useMemo(() => {
    return popularProducts.map((product) => {
      const { price, oldPrice } = getProductPrice(product);
      const imageUrl = getImageUrl(product);
      const discount = oldPrice && price < oldPrice 
        ? Math.round(((oldPrice - price) / oldPrice) * 100) 
        : 0;
      return {
        ...product,
        price,
        oldPrice,
        imageUrl,
        discount
      };
    });
  }, [popularProducts, getProductPrice, getImageUrl]);


  const handleLogout = useCallback(async () => {
    try {
      const t = getToken();
      if (t) {
        await fetch(`${API_BASE}/api/v1/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
        }).catch(() => {});
      }
    } finally {
      clearAuth();
      setProfileOpen(false);
      router.push("/");
    }
  }, [router]);

  const authed = !!token;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors ${
        scrolled ? "bg-black/45 backdrop-blur text-white" : "bg-transparent text-white"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-6">
        {/* Left */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => setMobileOpen((s) => !s)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            aria-label="Mở menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          <Link href="/" className="flex items-center shrink-0">
            <Image src="/logo.png" alt="Dola Bakery" width={48} height={48} className="h-12 w-auto mr-3" priority />
          </Link>

          {/* 👇 thêm key để remount nhẹ khi đổi route */}
          <SiteMenu key={pathname} position="mainmenu" variant="header" className="hidden md:block" />
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex items-center" ref={searchRef}>
            <div
              className={`hidden md:block overflow-hidden transition-all duration-300 ${
                searchOpen ? "w-[26rem] ml-2" : "w-0 ml-0"
              }`}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = searchQuery.trim();
                  if (!q) return;
                  setSearchOpen(false);
                  setSearchQuery("");
                  setSearchResults([]);
                  setSearchTotal(0);
                  setSearchTab("products");
                  router.push(`/search?q=${encodeURIComponent(q)}`);
                }}
                className="relative"
              >
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-80 z-10">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  ref={inputSearchRef}
                  name="q"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchOpen(false);
                      setSearchQuery("");
                      setSearchResults([]);
                    }
                  }}
                  placeholder="Tìm sản phẩm, mã sản phẩm…"
                  className="w-full h-10 pl-10 pr-24 rounded-xl bg-white/10 text-white placeholder-white/70
                             ring-1 ring-white/15 focus:ring-2 focus:ring-amber-500 outline-none transition"
                />
                {searchLoading && (
                  <span className="absolute right-20 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-4 w-4 text-white/60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                )}
                <button
                  type="submit"
                  className="absolute right-9 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-sm font-semibold
                             bg-amber-500 hover:bg-amber-600 text-white z-10"
                >
                  Tìm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                    setSearchResults([]);
                    setSearchTotal(0);
                    setSearchTab("products");
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-white/10 z-10"
                  aria-label="Đóng"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L12 13.4l-4.89 4.3-1.41-1.41L10.6 12 5.7 7.11 7.11 5.7 12 10.6l4.89-4.9 1.41 1.41Z" />
                  </svg>
                </button>

                {/* Search Suggestions Dropdown - Hiển thị tự động khi mở search */}
                {searchOpen && (
                  <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 mt-2 max-h-[500px] overflow-hidden rounded-lg border-2 border-amber-500 
                               bg-white shadow-2xl z-[100] animate-fadeIn flex flex-col"
                  >
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                      <button
                        type="button"
                        onClick={() => setSearchTab("products")}
                        className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-colors ${
                          searchTab === "products"
                            ? "bg-amber-500 text-white"
                            : "bg-white text-amber-600 hover:bg-amber-50"
                        }`}
                      >
                        Sản phẩm
                      </button>
                      <button
                        type="button"
                        onClick={() => setSearchTab("news")}
                        className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-colors ${
                          searchTab === "news"
                            ? "bg-amber-500 text-white"
                            : "bg-white text-amber-600 hover:bg-amber-50"
                        }`}
                      >
                        Tin tức
                      </button>
                    </div>

                    {/* Result Count - Chỉ hiển thị khi có query */}
                    {!searchLoading && searchTab === "products" && searchQuery.trim().length >= 2 && searchResults.length > 0 && (
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <p className="text-sm text-gray-600">
                          Có {searchTotal} sản phẩm
                        </p>
                      </div>
                    )}

                    {/* Content */}
                    <div className="overflow-y-auto max-h-[400px]">
                      {searchTab === "products" && (
                        <>
                          {/* Khi có query và đang search */}
                          {searchQuery.trim().length >= 2 ? (
                            <>
                              {searchLoading ? (
                                <div className="p-8 text-center text-gray-500 text-sm">Đang tìm kiếm...</div>
                              ) : searchResults.length > 0 ? (
                                <div className="py-2">
                                  {processedSearchResults.map((product) => (
                                    <ProductItem
                                      key={product.id}
                                      product={product}
                                      onClick={handleProductClick}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                  Không tìm thấy sản phẩm nào
                                </div>
                              )}
                            </>
                          ) : (
                            /* Khi chưa có query - Hiển thị sản phẩm phổ biến */
                            <>
                              {loadingPopular ? (
                                <div className="p-8 text-center text-gray-500 text-sm">Đang tải...</div>
                              ) : popularProducts.length > 0 ? (
                                <>
                                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                    <p className="text-sm text-gray-600 font-semibold">Sản phẩm nổi bật</p>
                                  </div>
                                  <div className="py-2">
                                    {processedPopularProducts.map((product) => (
                                      <ProductItem
                                        key={product.id}
                                        product={product}
                                        onClick={handleProductClick}
                                      />
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                  Nhập từ khóa để tìm kiếm sản phẩm
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                      
                      {searchTab === "news" && (
                        <div className="p-8 text-center text-gray-500 text-sm">
                          Tính năng tìm kiếm tin tức đang được phát triển
                        </div>
                      )}
                    </div>

                    {/* View All Button */}
                    {!searchLoading && searchTab === "products" && searchResults.length > 0 && (
                      <div className="px-4 py-3 text-center border-t-2 border-amber-500 bg-white">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const q = searchQuery.trim();
                            setSearchOpen(false);
                            setSearchQuery("");
                            setSearchResults([]);
                            setSearchTotal(0);
                            setSearchTab("products");
                            router.push(`/search?q=${encodeURIComponent(q)}`);
                          }}
                          className="w-full text-sm font-semibold text-amber-600 border-2 border-amber-500 rounded-lg py-2 
                                   hover:bg-amber-500 hover:text-white transition-colors"
                        >
                          Xem tất cả
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            <button
              onClick={() => setSearchOpen((s) => !s)}
              className="p-2 rounded-lg hover:bg-white/10"
              aria-label="Tìm kiếm"
              title="Tìm kiếm"
            >
              {searchOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L12 13.4l-4.89 4.3-1.41-1.41L10.6 12 5.7 7.11 7.11 5.7 12 10.6l4.89-4.9 1.41 1.41Z" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* ❤️ Yêu thích */}
          <Link href="/favorites" className="p-2 rounded-lg hover:bg-white/10" aria-label="Yêu thích">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21s-6.716-4.435-9.163-7.2C1.56 11.394 2.09 8.77 4.032 7.31a4.5 4.5 0 016.075.52L12 9l1.893-1.17a4.5 4.5 0 016.075-.52c1.943 1.46 2.472 4.083 1.195 6.49C18.716 16.565 12 21 12 21z" />
            </svg>
          </Link>

          {/* 🛒 Giỏ hàng */}
          <Link href="/cart" className="relative p-2 rounded-lg hover:bg-white/10" aria-label="Giỏ hàng">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 4h-2l-1 2H2v2h1l3.6 7.59a2 2 0 001.8 1.21H17a2 2 0 001.8-1.11l3.2-6.4A1 1 0 0021 8H7.42l-.7-2H7V4zm0 16a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 rounded-full bg-red-600 px-1.5 text-[11px] font-semibold">
                {cartCount}
              </span>
            )}
          </Link>

          {/* 👤 Tài khoản */}
          <div className="relative" ref={profileWrapRef}>
            <button
              onClick={() => setProfileOpen((s) => !s)}
              className="p-2 rounded-full hover:bg-white/10"
              aria-label="Tài khoản"
              title="Tài khoản"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z" />
              </svg>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-white/20 bg-black/70 backdrop-blur-md text-white shadow-lg shadow-black/40 overflow-hidden z-[60] animate-fadeIn">
                {!authed ? (
                  <div className="p-3 space-y-2">
                    <button
                      onClick={() => (window.location.href = "/login")}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition text-sm font-semibold shadow-md shadow-amber-700/30"
                    >
                      🔑 Đăng nhập
                    </button>

                    <button
                      onClick={() => (window.location.href = "/register")}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 border border-amber-400/50 hover:bg-amber-500/20 transition text-sm font-semibold"
                    >
                      🧁 Đăng ký tài khoản
                    </button>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {/* Thông tin nhanh KH */}
                    <div className="rounded-xl border border-white/10 p-3 bg-white/5 text-sm">
                      <div className="font-semibold">{profile?.name || "Khách hàng"}</div>
                      <div className="opacity-80">{profile?.email || "—"}</div>
                    </div>

                    <Link
                      href="/profile"
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 border border-white/15 hover:bg-white/10 transition text-sm font-semibold"
                      onClick={() => setProfileOpen(false)}
                    >
                      👤 Hồ sơ của tôi
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-red-600 hover:to-rose-700 transition text-sm font-semibold shadow-md shadow-rose-700/30"
                    >
                      🚪 Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/50 backdrop-blur">
          <nav className="container mx-auto px-4 py-3">
            <SiteMenu
              key={`mobile-${pathname}`}
              position="mainmenu"
              variant="list"
              className="space-y-2 [&_a]:block [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-2 [&_a]:hover:bg-white/10"
            />
          </nav>
        </div>
      )}
    </header>
  );
}
