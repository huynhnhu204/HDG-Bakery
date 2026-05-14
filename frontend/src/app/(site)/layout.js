// src/app/(site)/layout.js
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Slider from "@/components/Slider";
import CouponDrawer from "@/components/CouponDrawer";
import CouponNotification from "@/components/CouponNotification";

// Ưu tiên BACKEND_API, sau đó NEXT_PUBLIC_API_BASE, cuối cùng là local
const API_BASE =
  process.env.BACKEND_API?.replace(/\/+$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") ||
  "http://127.0.0.1:8000";

async function getBanners() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    const res = await fetch(
      `${API_BASE}/api/v1/banners?position=slideshow&status=1&per_page=0`,
      {
        cache: "no-store",
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const raw = await res.json().catch(() => null);
    return Array.isArray(raw) ? raw : raw?.data || [];
  } catch (e) {
    if (e.name === 'AbortError') return []; // Ignore abort errors
    return [];
  }
}

export const metadata = {

  title: "Dola Bakery",
};

export default async function SiteLayout({ children }) {
  const banners = await getBanners(); // SSR snapshot

  return (
    <>
      <Header />
      <Slider initialBanners={banners} apiBase={API_BASE} className="mb-0" />
     
      <main className="pt-0">{children}</main>
      <Footer />
      <CouponDrawer />
      <CouponNotification />
    </>
  );
}
