// src/components/Header.js
"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SiteMenu from "@/components/SiteMenu";

export default function Header() {
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const profileWrapRef = useRef(null);
  const searchRef = useRef(null);
  const inputSearchRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (profileWrapRef.current && !profileWrapRef.current.contains(e.target)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (searchOpen) inputSearchRef.current?.focus();
  }, [searchOpen]);

  // Đồng bộ badge giỏ hàng theo localStorage + sự kiện cart-updated
  useEffect(() => {
    const getCart = () => {
      try {
        const raw = localStorage.getItem("cart");
        if (!raw) {
          setCartCount(0);
          return;
        }
        const parsed = JSON.parse(raw);
        if (parsed?.items && Array.isArray(parsed.items)) {
          const totalQty = parsed.items.reduce((s, it) => s + Number(it.qty || 1), 0);
          setCartCount(totalQty);
        } else if (Array.isArray(parsed)) {
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

  // Link tiêu chuẩn (dùng cho một số chỗ còn lại)
  const NavLink = ({ href, children }) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`group relative font-semibold tracking-wide ${
          active ? "text-amber-300" : "text-white/90 hover:text-amber-300"
        }`}
      >
        {children}
        <span
          className={`absolute left-0 -bottom-2 h-[2px] bg-amber-400 transition-all duration-300 ${
            active ? "w-10" : "w-0 group-hover:w-10"
          }`}
        />
      </Link>
    );
  };

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
            <img src="/logo.png" alt="Dola Bakery" className="h-12 w-auto mr-3" />
          </Link>

          {/* Main menu lấy từ BE (mega dropdown) */}
          <SiteMenu position="mainmenu" variant="header" className="hidden md:block" />
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
                  const q = new FormData(e.currentTarget).get("q")?.toString().trim();
                  if (!q) return;
                  window.location.href = `/search?q=${encodeURIComponent(q)}`;
                }}
                className="relative"
              >
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-80">
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
                  placeholder="Tìm sản phẩm, mã sản phẩm…"
                  className="w-full h-10 pl-10 pr-24 rounded-xl bg-white/10 text-white placeholder-white/70
                             ring-1 ring-white/15 focus:ring-white/40 outline-none transition"
                />
                <button
                  type="submit"
                  className="absolute right-9 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-sm font-semibold
                             bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Tìm
                </button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-white/10"
                  aria-label="Đóng"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L12 13.4l-4.89 4.3-1.41-1.41L10.6 12 5.7 7.11 7.11 5.7 12 10.6l4.89-4.9 1.41 1.41Z" />
                  </svg>
                </button>
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

          {/* Yêu thích */}
          <Link href="/favorites" className="p-2 rounded-lg hover:bg-white/10" aria-label="Yêu thích">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21s-6.716-4.435-9.163-7.2C1.56 11.394 2.09 8.77 4.032 7.31a4.5 4.5 0 016.075.52L12 9l1.893-1.17a4.5 4.5 0 016.075-.52c1.943 1.46 2.472 4.083 1.195 6.49C18.716 16.565 12 21 12 21z" />
            </svg>
          </Link>

          {/* Giỏ hàng */}
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

          {/* Profile */}
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
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/15 bg-black/50 text-white backdrop-blur p-2 z-[55]">
                <button
                  onClick={() => (window.location.href = "/login")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/10 text-left"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a4 4 0 00-4 4v2H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-8a2 2 0 00-2-2h-1V6a4 4 0 00-4-4z" />
                  </svg>
                  Đăng nhập
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/50 backdrop-blur">
          <nav className="container mx-auto px-4 py-3">
            {/* Dạng list gọn cho mobile */}
            <SiteMenu position="mainmenu" variant="list" className="space-y-2 [&_a]:block [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-2 [&_a]:hover:bg-white/10" />
          </nav>
        </div>
      )}
    </header>
  );
}
