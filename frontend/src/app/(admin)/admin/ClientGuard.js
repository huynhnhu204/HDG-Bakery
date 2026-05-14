"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import NotificationDropdown from "@/components/admin/NotificationDropdown";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const ADMIN_TOKEN_KEY = "admin_token";

async function getJSON(url, token) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.message) || `${res.status} ${res.statusText}`);
  return data;
}

async function postJSON(url, token) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.message) || `${res.status} ${res.statusText}`);
  return data;
}

export default function ClientGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  // cho phép trang login
  if (pathname?.startsWith("/admin/login")) return <>{children}</>;

  const [ready, setReady] = useState(false);
  const [me, setMe] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isWarehouse = me?.roles === "warehouse";

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
    if (!token) {
      const safeNext = pathname && pathname !== "/admin/login" ? pathname : "/admin";
      router.replace(`/admin/login?next=${encodeURIComponent(safeNext)}`);
      return;
    }

    let mounted = true;
    getJSON(`${BASE}${API}/admin/me`, token)
      .then((u) => {
        if (!mounted) return;
        setMe(u);
        setReady(true);
      })
      .catch(() => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
        }
        const safeNext = pathname && pathname !== "/admin/login" ? pathname : "/admin";
        router.replace(`/admin/login?next=${encodeURIComponent(safeNext)}`);
      });

    return () => {
      mounted = false;
    };
  }, [router, pathname]);

  const onLogout = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
    try {
      await postJSON(`${BASE}${API}/admin/logout`, token || undefined);
    } catch {
      // im lặng
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
    router.replace("/admin/login");
  };

  const isActive = (p) => (p === "/admin" ? pathname === "/admin" : pathname?.startsWith(p));

  const itemCls = (active) =>
    [
      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150",
      "hover:bg-orange-50 hover:-translate-y-[1px]",
      active ? "bg-orange-100 text-orange-700 font-semibold shadow-sm" : "text-gray-700",
    ].join(" ");

  if (!ready) {
    return (
      <main className="min-h-[60vh] grid place-items-center bg-gray-50">
        <div className="flex flex-col items-center gap-2 text-gray-600">
          <div className="h-10 w-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <div className="animate-pulse text-sm">Đang kiểm tra phiên đăng nhập…</div>
        </div>
      </main>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-white border px-3 py-1.5 rounded shadow"
      >
        Bỏ qua menu
      </a>

      {/* Overlay mobile */}
      {sidebarOpen ? (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r flex flex-col shadow-sm
        transition-transform duration-200 ease-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        aria-label="Thanh điều hướng quản trị"
      >
        <div className="h-14 flex items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍞</span>
            <span className="font-bold text-orange-600 text-lg tracking-tight">Dola Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded hover:bg-orange-50 text-gray-500"
            aria-label="Đóng menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-3 text-sm overflow-y-auto">
          {!isWarehouse && (
            <>
              <Link href="/admin" className={itemCls(isActive("/admin"))}>
                <span>📊</span> <span>Dashboard</span>
              </Link>
              <Link href="/admin/orders" className={itemCls(isActive("/admin/orders"))}>
                <span>🛒</span> <span>Đơn hàng</span>
              </Link>
            </>
          )}

          {/* Sản phẩm */}
          {!isWarehouse && (
            <div>
              <div className="px-3 text-[10px] uppercase tracking-widest text-gray-400 mb-1">Sản phẩm</div>
              <div className="space-y-2">
                <Link href="/admin/products" className={itemCls(isActive("/admin/products"))}>
                  <span>🍰</span> <span>Sản phẩm</span>
                </Link>
                <Link href="/admin/products/images" className={itemCls(isActive("/admin/products/images"))}>
                  <span>🖼️</span> <span>Hình ảnh sản phẩm</span>
                </Link>
                <Link href="/admin/products/sale" className={itemCls(isActive("/admin/products/sale"))}>
                  <span>💸</span> <span>Sản phẩm giảm giá</span>
                </Link>
                <Link href="/admin/coupons" className={itemCls(isActive("/admin/coupons"))}>
                  <span>🏷️</span> <span>Mã giảm giá</span>
                </Link>
              </div>
            </div>
          )}

          {!isWarehouse && (
            <>
              <Link href="/admin/categories" className={itemCls(isActive("/admin/categories"))}>
                <span>📂</span> <span>Danh mục</span>
              </Link>
              <Link href="/admin/customers" className={itemCls(isActive("/admin/customers"))}>
                <span>👥</span> <span>Khách hàng</span>
              </Link>
              <Link href="/admin/contacts" className={itemCls(isActive("/admin/contacts"))}>
                <span>📧</span> <span>Liên hệ</span>
              </Link>
            </>
          )}

          {/* Phản hồi */}
          {!isWarehouse && <div>
            <div className="px-3 text-[10px] uppercase tracking-widest text-gray-400 mb-1">Phản hồi</div>
            <Link href="/admin/reviews" className={itemCls(isActive("/admin/reviews"))}>
              <span>⭐</span> <span>Đánh giá</span>
            </Link>
          </div>}

          {/* Dữ liệu dùng chung */}
          {!isWarehouse && <div>
            <div className="px-3 text-[10px] uppercase tracking-widest text-gray-400 mb-1">Dữ liệu dùng chung</div>
            <Link href="/admin/lookups" className={itemCls(isActive("/admin/lookups"))}>
              <span>🧩</span> <span>Lookups</span>
            </Link>
          </div>}

          {/* Tin tức */}
          {!isWarehouse && <div>
            <div className="px-3 text-[10px] uppercase tracking-widest text-gray-400 mb-1">Tin tức</div>
            <Link href="/admin/topics" className={itemCls(isActive("/admin/topics"))}>
              <span>📰</span> <span>Chủ đề</span>
            </Link>
            <Link href="/admin/posts" className={itemCls(isActive("/admin/posts"))}>
              <span>✍️</span> <span>Bài viết</span>
            </Link>
          </div>}

          {/* Hiển thị */}
          {!isWarehouse && <div>
            <div className="px-3 text-[10px] uppercase tracking-widest text-gray-400 mb-1">Hiển thị</div>
            <Link href="/admin/banners" className={itemCls(isActive("/admin/banners"))}>
              <span>🖼️</span> <span>Banners</span>
            </Link>
            <Link href="/admin/menu" className={itemCls(isActive("/admin/menu"))}>
              <span>📑</span> <span>Menu</span>
            </Link>
          </div>}

          {/* Kho */}
          <div>
            <div className="px-3 text-[10px] uppercase tracking-widest text-gray-400 mb-1">Kho</div>
            <Link href="/admin/stocks" className={itemCls(isActive("/admin/stocks"))}>
              <span>📦</span> <span>{isWarehouse ? "Kho của tôi" : "Tồn kho"}</span>
            </Link>
          </div>

          {/* Cấu hình */}
          {!isWarehouse && <div>
            <div className="px-3 text-[10px] uppercase tracking-widest text-gray-400 mb-1">Cấu hình</div>
            <Link href="/admin/settings" className={itemCls(isActive("/admin/settings"))}>
              <span>⚙️</span> <span>Thiết lập</span>
            </Link>
          </div>}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white border-b flex items-center justify-between px-4 md:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg border bg-white text-gray-600 hover:bg-orange-50"
              aria-label="Mở menu"
            >
              ☰
            </button>
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm…"
                aria-label="Tìm kiếm"
                className="border rounded-lg pl-9 pr-3 py-1.5 text-sm w-64 max-w-full focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <div className="flex items-center gap-2">
              <div className="flex flex-col text-right leading-tight">
                <span className="text-sm text-gray-700 font-medium">{me?.name || "Admin"}</span>
                <span className="text-xs text-gray-400">{isWarehouse ? "Nhân viên kho" : "Quản trị viên"}</span>
              </div>
              <button
                onClick={onLogout}
                className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-1.5 text-sm text-orange-700 hover:bg-orange-100 transition"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto px-4 md:px-6 py-5 bg-gray-50"
        >
          <div className="animate-[fadeIn_0.25s_ease-out]">
            {children}
          </div>
        </main>
      </div>

      {/* nhỏ xíu css keyframe để khỏi phụ thuộc class lạ */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
