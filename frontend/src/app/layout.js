// src/app/layout.js
import { Suspense } from "react";
import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Dola Bakery",
  description: "Fresh & tasty every day",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-[#faf7f2] text-gray-800">
        <Suspense fallback={null}>{children}</Suspense>

        {/* Nhúng Google Maps API */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places`}
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
