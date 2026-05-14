// src/app/(site)/about/page.js
import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "Giới thiệu | Dola Bakery",
  description:
    "Dola Bakery — tiệm bánh với hơn 10 năm kinh nghiệm. Bánh mousse, su kem, tart, tiramisu, phô mai, cookie… Nhận làm theo yêu cầu, giao nhanh nội thành.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "Giới thiệu | Dola Bakery",
    description:
      "Hơn 10 năm làm bánh với sự tỉ mỉ và đam mê. Dola Bakery phục vụ bánh tươi ngon mỗi ngày.",
    url: "/about",
    siteName: "Dola Bakery",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Giới thiệu | Dola Bakery",
    description:
      "Hơn 10 năm làm bánh với sự tỉ mỉ và đam mê. Dola Bakery phục vụ bánh tươi ngon mỗi ngày.",
  },
};

export default function AboutPage() {
  // --- JSON-LD cho SEO ---
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
      { "@type": "ListItem", position: 2, name: "Giới thiệu", item: "/about" },
    ],
  };

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: "Dola Bakery",
    url: "https://example.com", // ← thay domain thật
    logo: "/logo.png",
    telephone: "19006750",
    email: "heyzun@support.vn",
    address: {
      "@type": "PostalAddress",
      streetAddress: "70 Lữ Gia, Phường 15, Quận 11",
      addressLocality: "TP.HCM",
      addressCountry: "VN",
    },
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"], opens: "08:00", closes: "22:00" },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Dola Bakery mở cửa lúc mấy giờ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Chúng tôi mở cửa từ 8:00 đến 22:00 mỗi ngày (Thứ 2 → Chủ nhật).",
        },
      },
      {
        "@type": "Question",
        name: "Có nhận thiết kế bánh theo yêu cầu không?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Có. Dola Bakery nhận thiết kế bánh theo yêu cầu cho sinh nhật, kỷ niệm, sự kiện…",
        },
      },
      {
        "@type": "Question",
        name: "Dola giao hàng khu vực nào?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Chúng tôi giao nhanh nội thành TP.HCM, đóng gói an toàn để bánh luôn tươi ngon.",
        },
      },
      {
        "@type": "Question",
        name: "Đặt bánh như thế nào?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Bạn có thể đặt trực tuyến tại trang Sản phẩm, gọi hotline 1900 6750 hoặc liên hệ qua mục Liên hệ.",
        },
      },
    ],
  };

  return (
    <main className="min-h-dvh">
      {/* JSON-LD */}
      <Script id="ld-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbLd)}
      </Script>
      <Script id="ld-org" type="application/ld+json">
        {JSON.stringify(orgLd)}
      </Script>
      <Script id="ld-faq" type="application/ld+json">
        {JSON.stringify(faqLd)}
      </Script>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="border-b bg-amber-50/60">
        <div className="container mx-auto px-4 h-12 flex items-center text-sm">
          <ol className="flex items-center gap-1 text-gray-600">
            <li><Link href="/" className="hover:underline">Trang chủ</Link></li>
            <li aria-hidden="true" className="px-1">/</li>
            <li className="text-gray-900 font-semibold">Giới thiệu</li>
          </ol>
        </div>
      </nav>

      {/* Nội dung chính */}
      <section className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Bài viết */}
          <article className="lg:col-span-2">
            <header className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-800">
                Giới thiệu Dola Bakery
              </h1>
              <p className="mt-2 text-gray-700">
                Hơn 10 năm làm bánh với tất cả đam mê – mỗi chiếc bánh tại
                Dola Bakery đều được chăm chút tỉ mỉ từ nguyên liệu đến hương vị.
              </p>
            </header>

            <div className="prose max-w-none prose-headings:text-amber-800 prose-p:text-gray-700">
              <h2 id="ve-chung-toi">Dola Bakery là ai?</h2>
              <p>
                Dola Bakery là một tiệm bánh nằm ẩn mình giữa phố xá nhộn nhịp
                của thành phố. Với bề dày hơn 10 năm kinh nghiệm trong lĩnh vực
                làm bánh, Dola Bakery đã nhanh chóng trở thành điểm đến lý tưởng
                cho những ai đam mê bánh ngọt và muốn thưởng thức những món đặc
                sản tại địa phương.
              </p>
              <p>
                Tiệm bánh nổi tiếng này tự hào sở hữu một đội ngũ nhân viên tận
                tâm và giàu kinh nghiệm. Họ không chỉ đảm bảo mang đến cho khách
                hàng những món bánh được làm tinh tế với sự tỉ mỉ và tình yêu,
                mà còn luôn sẵn lòng lắng nghe và đáp ứng mọi nhu cầu đặc biệt
                của khách hàng.
              </p>

              <h2 id="thuc-don">Thực đơn đa dạng</h2>
              <p>
                Sự phong phú và đa dạng của thực đơn tại Dola Bakery là một điểm
                nhấn đáng chú ý. Khách hàng có thể chọn từ một loạt các loại
                bánh tươi ngon như bánh mousse, bánh su kem, bánh tart, bánh gạo,
                bánh tiramisu, bánh phô mai, bánh cookie và nhiều loại bánh khác
                nữa. Mỗi món bánh đều được chế biến từ những nguyên liệu tươi
                ngon nhất và được trang trí tỉ mỉ, mang lại một trải nghiệm
                thưởng thức thật tuyệt vời.
              </p>

              <h2 id="sang-tao">Sáng tạo trong từng chi tiết</h2>
              <p>
                Không chỉ chăm chút vào hương vị, Dola Bakery cũng đặc biệt quan
                tâm đến việc thể hiện sự sáng tạo và độc đáo trong từng chi tiết
                trên các món bánh của mình. Bạn có thể tìm thấy những chiếc bánh
                được trang trí tinh tế với hình dáng, màu sắc và hoa văn độc đáo
                – tạo nên phong cách riêng biệt cho Dola Bakery.
              </p>

              <h2 id="khong-gian">Không gian ấm cúng</h2>
              <p>
                Khách hàng yêu mến Dola Bakery không chỉ vì bánh ngon mà còn vì
                không gian ấm cúng, thoải mái. Với thiết kế sang trọng pha chút
                cổ điển, đây là nơi lý tưởng để thư giãn, thưởng thức bánh cùng
                một tách cà phê nóng.
              </p>

              <h2 id="vi-sao-chon">Lý do nên chọn Dola Bakery</h2>
              <p>
                Dola Bakery là điểm dừng chân lý tưởng để tìm mua bánh ngon cho
                tiệc tùng, bánh sinh nhật đặc biệt, hay đơn giản là một phần bánh
                nhỏ để làm ngày mới thêm ngọt ngào.
              </p>
            </div>

            {/* CTA nội bộ giúp SEO internal linking */}
            <div className="mt-8 flex gap-3">
              <Link
                href="/product"
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 font-semibold text-white hover:bg-orange-700"
              >
                Xem menu bánh
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 17l5-5-5-5v10z" />
                </svg>
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 hover:bg-gray-50"
              >
                Liên hệ đặt bánh
              </Link>
            </div>

            {/* FAQ hiển thị (khớp JSON-LD) */}
            <section className="mt-10">
              <h2 className="text-2xl font-bold text-amber-800">Câu hỏi thường gặp</h2>
              <div className="mt-4 divide-y rounded-xl border bg-white">
                {[
                  {
                    q: "Dola Bakery mở cửa lúc mấy giờ?",
                    a: "Chúng tôi mở cửa từ 8:00 đến 22:00 mỗi ngày (Thứ 2 → Chủ nhật).",
                  },
                  {
                    q: "Có nhận thiết kế bánh theo yêu cầu không?",
                    a: "Có. Dola Bakery nhận thiết kế bánh theo yêu cầu cho sinh nhật, kỷ niệm và sự kiện.",
                  },
                  {
                    q: "Dola giao hàng khu vực nào?",
                    a: "Giao nhanh nội thành TP.HCM, đóng gói an toàn để bánh luôn tươi ngon.",
                  },
                  {
                    q: "Đặt bánh như thế nào?",
                    a: "Đặt trực tuyến tại trang Sản phẩm, gọi hotline 1900 6750 hoặc vào trang Liên hệ.",
                  },
                ].map((item, i) => (
                  <details key={i} className="group p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-gray-900">
                      {item.q}
                      <span className="ml-3 rounded-md border px-2 py-0.5 text-xs text-gray-500 group-open:rotate-180 transition">
                        ▼
                      </span>
                    </summary>
                    <p className="mt-2 text-gray-700">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </article>

          {/* Sidebar thông tin nhanh (sticky) */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">
                Thông tin liên hệ
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Hotline:</strong> <a href="tel:19006750" className="hover:underline">1900 6750</a></p>
                <p><strong>Email:</strong> <a href="mailto:heyzun@support.vn" className="hover:underline">heyzun@support.vn</a></p>
                <p><strong>Địa chỉ:</strong> 70 Lữ Gia, P.15, Q.11, TP.HCM</p>
                <p><strong>Giờ mở cửa:</strong> 8:00 – 22:00 (Thứ 2 → CN)</p>
              </div>

              <div className="mt-6 grid gap-2">
                <Link href="/product" className="rounded-lg bg-amber-600 px-3 py-2 text-center font-semibold text-white hover:bg-amber-700">
                  Mua bánh ngay
                </Link>
                <Link href="/contact" className="rounded-lg border px-3 py-2 text-center hover:bg-gray-50">
                  Liên hệ tư vấn
                </Link>
              </div>

              {/* Mục lục mini giúp UX/SEO */}
              <div className="mt-8">
                <p className="mb-2 text-sm font-semibold text-gray-900">Mục lục</p>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li><a href="#ve-chung-toi" className="hover:underline">Dola Bakery là ai?</a></li>
                  <li><a href="#thuc-don" className="hover:underline">Thực đơn đa dạng</a></li>
                  <li><a href="#sang-tao" className="hover:underline">Sáng tạo trong từng chi tiết</a></li>
                  <li><a href="#khong-gian" className="hover:underline">Không gian ấm cúng</a></li>
                  <li><a href="#vi-sao-chon" className="hover:underline">Lý do nên chọn</a></li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
