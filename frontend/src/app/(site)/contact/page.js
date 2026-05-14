// src/app/(site)/contact/page.js
import Script from "next/script";
import ContactForm from "@/components/ContactForm";

const title =
  "Liên hệ Dola Bakery | Địa chỉ, hotline, email & giờ mở cửa";
const description =
  "Liên hệ Dola Bakery để được tư vấn và hỗ trợ nhanh chóng. Địa chỉ 70 Lữ Gia, P.15, Q.11, TP.HCM • Hotline 1900 6750 • Email heyzun@support.vn • Mở cửa 8h–22h.";

export const metadata = {
  title,
  description,
  alternates: { canonical: "/contact" },
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    url: "/contact",
    siteName: "Dola Bakery",
    type: "website",
    images: ["/og-default.jpg"], // đặt ảnh og ở /public nếu có
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-default.jpg"],
  },
};

export default function ContactPage() {
  const info = {
    name: "Dola Bakery",
    address: "70 Lữ Gia, Phường 15, Quận 11, TP.HCM",
    phone: "19006750",
    phoneDisplay: "1900 6750",
    email: "heyzun@support.vn",
    workTime: "8h - 22h (Thứ 2 → CN)",
    zalo: "0933874215",
    messenger: "dolabakery",
    // EMBED map chuẩn
    mapEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.220316252819!2d106.647!3d10.793!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752ee6b4c4c7f7%3A0x8f9d6f2a3a2a1!2sL%C6%B0%20Gia%2C%20Ph%C6%B0%E1%BB%9Dng%2015%2C%20Qu%E1%BA%ADn%2011!5e0!3m2!1svi!2svi!4v1700000000000",
  };

  // JSON-LD: breadcrumb + business + contact page
  const ldBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
      { "@type": "ListItem", position: 2, name: "Liên hệ", item: "/contact" },
    ],
  };

  const ldOrg = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: info.name,
    url: "/",
    telephone: info.phoneDisplay,
    email: info.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "70 Lữ Gia, Phường 15, Quận 11",
      addressLocality: "TP.HCM",
      addressCountry: "VN",
    },
    openingHours: "Mo-Su 08:00-22:00",
    logo: "/logo.png",
    sameAs: [
      `https://zalo.me/${info.zalo}`,
      `https://m.me/${info.messenger}`,
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: info.phoneDisplay,
        contactType: "customer service",
        areaServed: "VN",
        availableLanguage: ["vi", "en"],
      },
    ],
  };

  const ldContactPage = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Liên hệ Dola Bakery",
    url: "/contact",
    about: {
      "@type": "Organization",
      name: info.name,
    },
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {/* JSON-LD */}
      <Script id="ld-breadcrumb" type="application/ld+json">
        {JSON.stringify(ldBreadcrumb)}
      </Script>
      <Script id="ld-org" type="application/ld+json">
        {JSON.stringify(ldOrg)}
      </Script>
      <Script id="ld-contactpage" type="application/ld+json">
        {JSON.stringify(ldContactPage)}
      </Script>

      {/* Heading chính */}
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-orange-600">
          Liên hệ Dola Bakery
        </h1>
        <p className="mt-2 text-gray-600">
          Chúng tôi luôn sẵn sàng hỗ trợ bạn từ 8h đến 22h mỗi ngày.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thông tin + liên hệ nhanh */}
        <section
          aria-labelledby="contact-info-heading"
          className="rounded-xl bg-amber-100/70 border border-amber-200 p-5"
        >
          <h2 id="contact-info-heading" className="text-xl font-bold text-amber-900 mb-4">
            Thông tin liên hệ
          </h2>

          <address className="not-italic grid sm:grid-cols-2 gap-4 text-amber-900">
            <div className="flex gap-3 items-start">
              <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-200">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                </svg>
              </span>
              <div>
                <p className="font-semibold">Địa chỉ</p>
                <p className="text-amber-800/80">{info.address}</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-200">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1a11 11 0 1011 11A11.012 11.012 0 0012 1zm1 11H7V10h5V5h2z" />
                </svg>
              </span>
              <div>
                <p className="font-semibold">Giờ mở cửa</p>
                <p className="text-amber-800/80">{info.workTime}</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-200">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011.1-.2 11.7 11.7 0 003.7.6 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.4a1 1 0 011 1 11.7 11.7 0 00.6 3.7 1 1 0 01-.2 1.1L6.6 10.8z" />
                </svg>
              </span>
              <div>
                <p className="font-semibold">Hotline</p>
                <a
                  className="text-amber-800/80 hover:underline"
                  href={`tel:${info.phone}`}
                  aria-label={`Gọi ${info.phoneDisplay}`}
                >
                  {info.phoneDisplay}
                </a>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-200">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5z" />
                </svg>
              </span>
              <div>
                <p className="font-semibold">Email</p>
                <a
                  className="text-amber-800/80 hover:underline"
                  href={`mailto:${info.email}`}
                  aria-label={`Gửi email tới ${info.email}`}
                >
                  {info.email}
                </a>
              </div>
            </div>
          </address>

          {/* Liên hệ nhanh */}
          <div className="mt-5 flex flex-wrap gap-3" aria-label="Liên hệ nhanh">
            <a
              href={`tel:${info.phone}`}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-amber-700 hover:bg-amber-50"
              aria-label="Gọi hotline"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011.1-.2 11.7 11.7 0 003.7.6 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.4a1 1 0 011 1 11.7 11.7 0 00.6 3.7 1 1 0 01-.2 1.1L6.6 10.8z" />
              </svg>
              Gọi ngay
            </a>
            <a
              href={`https://zalo.me/${info.zalo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-amber-700 hover:bg-amber-50"
              aria-label="Nhắn Zalo"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center font-extrabold">
                Z
              </span>
              Zalo
            </a>
            <a
              href={`https://m.me/${info.messenger}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-amber-700 hover:bg-amber-50"
              aria-label="Nhắn Messenger"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.5 2 2 6 2 10.7c0 2.7 1.4 5.1 3.7 6.7V22l3.4-1.9c.9.2 1.8.3 2.9.3 5.5 0 10-4.1 10-9.7S17.5 2 12 2zm.5 10.9l-2.8-3-5 3.1 5.8-6.2 2.9 3 4.9-3.1-5.8 6.2z" />
              </svg>
              Messenger
            </a>
            <a
              href={`mailto:${info.email}`}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-amber-700 hover:bg-amber-50"
              aria-label="Gửi email"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5z" />
              </svg>
              Email
            </a>
            <a
              href={`https://www.google.com/maps?daddr=${encodeURIComponent(info.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-amber-700 hover:bg-amber-50"
              aria-label="Chỉ đường Google Maps"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7z" />
              </svg>
              Chỉ đường
            </a>
          </div>
        </section>

        {/* Map */}
        <section className="rounded-xl overflow-hidden border">
          <iframe
            src={info.mapEmbed}
            title="Bản đồ đường đi đến Dola Bakery"
            width="100%"
            height="560"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </section>
      </div>

      {/* Form liên hệ */}
      <section
        aria-labelledby="contact-form-heading"
        className="mt-6 rounded-xl bg-amber-100/70 border border-amber-200 p-5"
      >
        <h2 id="contact-form-heading" className="text-xl font-extrabold text-amber-800 mb-3">
          Liên hệ với chúng tôi
        </h2>
        <p className="text-amber-900/80 mb-4">
          Nếu bạn có thắc mắc, hãy để lại thông tin. Chúng tôi sẽ liên lạc sớm nhất.
        </p>
        <ContactForm />
      </section>

      {/* Nút nổi liên hệ nhanh */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3" aria-label="Nút liên hệ nhanh">
        <a
          href={`tel:${info.phone}`}
          className="h-12 w-12 rounded-full bg-amber-600 text-white shadow-lg flex items-center justify-center hover:brightness-110"
          aria-label="Gọi hotline"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011.1-.2 11.7 11.7 0 003.7.6 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.4a1 1 0 011 1 11.7 11.7 0 00.6 3.7 1 1 0 01-.2 1.1L6.6 10.8z" />
          </svg>
        </a>
        <a
          href={`https://zalo.me/${info.zalo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="h-12 w-12 rounded-full bg-amber-500 text-white shadow-lg flex items-center justify-center hover:brightness-110"
          aria-label="Zalo"
        >
          <span className="font-extrabold">Z</span>
        </a>
        <a
          href={`https://m.me/${info.messenger}`}
          target="_blank"
          rel="noopener noreferrer"
          className="h-12 w-12 rounded-full bg-amber-400 text-white shadow-lg flex items-center justify-center hover:brightness-110"
          aria-label="Messenger"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.5 2 2 6 2 10.7c0 2.7 1.4 5.1 3.7 6.7V22l3.4-1.9c.9.2 1.8.3 2.9.3 5.5 0 10-4.1 10-9.7S17.5 2 12 2zm.5 10.9l-2.8-3-5 3.1 5.8-6.2 2.9 3 4.9-3.1-5.8 6.2z" />
          </svg>
        </a>
      </div>
    </main>
  );
}
