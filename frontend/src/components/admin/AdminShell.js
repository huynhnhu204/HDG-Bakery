"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function NavItem({ href, label, icon }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition
        ${active ? "bg-orange-100 text-orange-700 font-semibold" : "hover:bg-gray-100"}
      `}
    >
      <span className="w-5 h-5">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function AdminShell({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen((s) => !s)}
              className="p-2 rounded-lg hover:bg-gray-100 md:hidden"
              aria-label="Mở/đóng menu"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <Link href="/admin" className="flex items-center gap-2 font-extrabold">
              <img src="/logo.png" alt="Dola Bakery" className="h-7 w-auto" />
              <span>Admin</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-sm"
              title="Về trang bán hàng"
            >
              Xem cửa hàng
            </Link>
            <Link
              href="/profile"
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="Hồ sơ"
              title="Hồ sơ"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="container mx-auto px-4 py-4 grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <aside
          className={`col-span-12 md:col-span-3 lg:col-span-2 md:sticky md:top-16 md:self-start
            bg-white border rounded-xl p-3 ${open ? "block" : "hidden"} md:block
          `}
        >
          <nav className="space-y-1">
            <NavItem
              href="/admin"
              label="Bảng điều khiển"
              icon={<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h5v8H3v-8zm7 5h11v3H10v-3z" /></svg>}
            />
            <NavItem
              href="/admin/products"
              label="Sản phẩm"
              icon={<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16V8l-9-5-9 5v8l9 5 9-5zM6 9.3L12 6l6 3.3v5.4l-6 3.3-6-3.3V9.3z" /></svg>}
            />
            <NavItem
              href="/admin/orders"
              label="Đơn hàng"
              icon={<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4h10l1 2h4v2h-2l-2 12H6L4 8H2V6h4l1-2zm3 16a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4z" /></svg>}
            />
            <NavItem
              href="/admin/customers"
              label="Khách hàng"
              icon={<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.7 0 3-1.3 3-3S17.7 5 16 5s-3 1.3-3 3 1.3 3 3 3zM8 11c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.7 0-8 1.3-8 4v3h10v-3c0-1.5.7-2.8 1.8-3.8C10.7 12.5 9.4 13 8 13zm8 0c-1.4 0-2.7.5-3.8 1.2 1.1 1 1.8 2.3 1.8 3.8v3H24v-3c0-2.7-5.3-4-8-4z" /></svg>}
            />
            <NavItem
              href="/admin/posts"
              label="Bài viết"
              icon={<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v2H4V4zm0 4h10v2H4V8zm0 4h16v2H4v-2zm0 4h10v2H4v-2z" /></svg>}
            />
            <NavItem
              href="/admin/settings"
              label="Cài đặt"
              icon={<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.4 12.9c.04-.3.06-.6.06-.9s-.02-.6-.06-.9l2.1-1.6a.5.5 0 00.12-.64l-2-3.46a.5.5 0 00-.6-.22l-2.5 1a7.3 7.3 0 00-1.6-.9l-.4-2.7a.5.5 0 00-.5-.41h-4a.5.5 0 00-.5.41l-.4 2.7c-.57.22-1.1.52-1.6.9l-2.5-1a.5.5 0 00-.6.22l-2 3.46a.5.5 0 00.12.64l2.1 1.6c-.04.3-.06.6-.06.9s.02.6.06.9l-2.1 1.6a.5.5 0 00-.12.64l-2 3.46c.12.2.37.28.6.22l2.5-1c.5.38 1.03.68 1.6.9l.4 2.7a.5.5 0 00.5.41h4a.5.5 0 00.5-.41l.4-2.7c-.57-.22-1.1-.52-1.6-.9l2.5 1c.23.06.48-.02.6-.22l2-3.46a.5.5 0 00-.12-.64l-2.1-1.6zM12 15.5A3.5 3.5 0 1112 8a3.5 3.5 0 010 7.5z" /></svg>}
            />
          </nav>
        </aside>

        {/* Main */}
        <main className="col-span-12 md:col-span-9 lg:col-span-10">{children}</main>
      </div>
    </div>
  );
}
