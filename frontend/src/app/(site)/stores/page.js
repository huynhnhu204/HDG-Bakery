
import Script from "next/script";
import Link from "next/link";
import StoresClient from "@/components/StoresClient";

export const metadata = {
  title: "Hệ thống cửa hàng | Dola Bakery",
  description:
    "Danh sách chi nhánh Dola Bakery trên toàn quốc: Sài Gòn, Bình Dương, Cần Thơ, Hà Nội, Đà Nẵng. Xem địa chỉ, hotline, chỉ đường Google Maps.",
  alternates: { canonical: "/stores" },
  openGraph: {
    title: "Hệ thống cửa hàng | Dola Bakery",
    description: "Tìm cửa hàng Dola Bakery gần bạn. Địa chỉ, hotline, giờ mở cửa và chỉ đường.",
    url: "/stores",
    siteName: "Dola Bakery",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Hệ thống cửa hàng | Dola Bakery",
    description: "Danh sách chi nhánh Dola Bakery và bản đồ chỉ đường.",
  },
};

// ---- DỮ LIỆU CHI NHÁNH (rút gọn) ----
const STORES = [
  { id:"sg-lu-gia", name:"Dola Sài Gòn", province:"TP.Hồ Chí Minh", district:"Quận 11",
    address:"Tầng 3, 70 Lữ Gia, Phường 15, Quận 11, TP.HCM", hotline:"1900 6750" },
  { id:"bd-phu-tho", name:"Dola Bình Dương", province:"Bình Dương", district:"TP.Thủ Dầu Một",
    address:"169/34 Nguyễn Hữu Cảnh, Phường Phú Thọ, TP.Thủ Dầu Một, Tỉnh Bình Dương", hotline:"1900 6750" },
  { id:"ct-ninh-kieu", name:"Dola Cần Thơ", province:"Cần Thơ", district:"Quận Ninh Kiều",
    address:"81 đường Phan Huy Chú, KDC Thới Nhựt I, Phường An Khánh, Quận Ninh Kiều, TP Cần Thơ", hotline:"1900 6750" },
  { id:"hn-doi-can", name:"Dola Hà Nội (Đội Cấn)", province:"Hà Nội", district:"Quận Ba Đình",
    address:"Tầng 6 - 266 Đội Cấn, Phường Liễu Giai, Quận Ba Đình, Hà Nội", hotline:"1900 6750" },
  { id:"dn-hai-chau", name:"Dola Đà Nẵng", province:"Đà Nẵng", district:"Quận Hải Châu",
    address:"181 đường Huỳnh Tấn Phát, Phường Hoà Cường Nam, Quận Hải Châu, TP Đà Nẵng", hotline:"1900 6750" },
  { id:"hn-hoang-quoc-viet", name:"Dola Hoàng Quốc Việt", province:"Hà Nội", district:"Quận Cầu Giấy",
    address:"38 Hoàng Quốc Việt, Phường Nghĩa Tân, Quận Cầu Giấy, Hà Nội", hotline:"1900 6750" },
  { id:"hn-hoang-dao-thuy", name:"Dola Hoàng Đạo Thúy", province:"Hà Nội", district:"Quận Cầu Giấy",
    address:"150 Hoàng Đạo Thúy, Phường Trung Hòa, Quận Cầu Giấy, Hà Nội", hotline:"1900 6750" },
  { id:"hn-tran-phu", name:"Dola Trần Phú", province:"Hà Nội", district:"Quận Hà Đông",
    address:"95 Trần Phú, Phường Văn Quán, Quận Hà Đông, Hà Nội", hotline:"1900 6750" },
];

function makeOrgLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Dola Bakery",
    url: "/stores",
    logo: "/logo.png",
    department: STORES.map((s) => ({
      "@type": "LocalBusiness",
      name: s.name,
      telephone: s.hotline,
      address: {
        "@type": "PostalAddress",
        streetAddress: s.address,
        addressLocality: s.district,
        addressRegion: s.province,
        addressCountry: "VN",
      },
    })),
  };
}

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
    { "@type": "ListItem", position: 2, name: "Hệ thống cửa hàng", item: "/stores" },
  ],
};

export default function StoresPage() {
  const orgLd = makeOrgLd();

  return (
    <main className="container mx-auto px-4 py-8">
      {/* JSON-LD */}
      <Script id="ld-stores" type="application/ld+json">
        {JSON.stringify(orgLd)}
      </Script>
      <Script id="ld-breadcrumb-stores" type="application/ld+json">
        {JSON.stringify(breadcrumbLd)}
      </Script>

      {/* BREADCRUMB + 2 NÚT CTA (Trang chủ / Liên hệ) */}
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-600">
          <ol className="flex items-center gap-1">
            <li><Link href="/" className="hover:underline">Trang chủ</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-900 font-semibold">Hệ thống cửa hàng</li>
          </ol>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/" className="rounded-lg border px-3 py-1.5 hover:bg-gray-50" rel="up">
            Trang chủ
          </Link>
          <Link href="/contact" className="rounded-lg bg-orange-600 px-3 py-1.5 font-semibold text-white hover:bg-orange-700">
            Liên hệ
          </Link>
        </div>
      </header>

      {/* Intro badges */}
      <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-200">🍞</span>
          <p className="text-amber-900"><strong>Hệ thống 8 cửa hàng</strong><br />Trên toàn quốc</p>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-200">👨‍🍳</span>
          <p className="text-amber-900"><strong>Hơn 100 nhân viên</strong><br />Để phục vụ quý khách</p>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-200">🕒</span>
          <p className="text-amber-900"><strong>Mở cửa 8–22h</strong><br />Cả CN & Lễ tết</p>
        </div>
      </section>

      {/* Lưới: danh sách + bản đồ */}
      <StoresClient stores={STORES} />
    </main>
  );
}
