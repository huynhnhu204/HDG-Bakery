import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import Gallery from "./Gallery";
import RecentlyViewed from "./RecentlyViewed";
import { ProductFavoriteButton } from "./ProductClientWrapper";
import ProductCoupons from "@/components/ProductCoupons";
import ProductReviewsSection from "./ProductReviewsSection";
import VariantPricingBox from "./VariantPricingBox";
import RelatedProductCard from "./RelatedProductCard";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

async function fetchJSON(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function normImg(src) {
  if (!src) return "/slide1.jpg";
  const s = typeof src === "string" ? src : src.image || src.url || src.src || "";
  if (!s) return "/slide1.jpg";
  if (s.startsWith("http")) return s;
  if (s.startsWith("storage/")) return `${API_BASE}/api/v1/${s}`;
  if (s.startsWith("/")) return `${API_BASE}/api/v1${s}`;
  return "/slide1.jpg";
}

function isSaleActive(sale) {
  if (!sale) return false;
  if (String(sale.status ?? 1) !== "1") return false;
  const now = new Date();
  const dateBegin = sale.date_begin ? new Date(sale.date_begin) : null;
  const dateEnd = sale.date_end ? new Date(sale.date_end) : null;
  if (dateBegin && now < dateBegin) return false;
  if (dateEnd && now > dateEnd) return false;
  return true;
}

function normalizeProductForSSR(product) {
  if (!product) return product;
  const normalized = { ...product };

  if (normalized.thumbnail) normalized.thumbnail = normImg(normalized.thumbnail);
  if (normalized.image) normalized.image = normImg(normalized.image);
  if (Array.isArray(normalized.images)) {
    normalized.images = normalized.images.map((img) =>
      normImg(typeof img === "string" ? img : img.image || img.url || img.src || "")
    );
  }

  let activeSale = null;
  if (normalized.product_sale && isSaleActive(normalized.product_sale)) {
    activeSale = normalized.product_sale;
  } else if (Array.isArray(normalized.sales) && normalized.sales.length > 0) {
    activeSale = normalized.sales.find((s) => isSaleActive(s)) || null;
  }

  if (activeSale && activeSale.price_sale) {
    const salePrice = Number(activeSale.price_sale);
    const basePrice = Number(normalized.price_buy ?? 0);
    if (salePrice > 0 && salePrice < basePrice) {
      normalized.price_sale = salePrice;
      normalized.product_sale = activeSale;
    }
  }

  normalized.available_quantity = normalized.available_quantity ?? 0;
  normalized.is_in_stock = normalized.is_in_stock ?? normalized.available_quantity > 0;
  normalized.variants = Array.isArray(normalized.variants) ? normalized.variants : [];

  return normalized;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const slugParam = String(slug || "").trim();

  const p = await fetchJSON(`${API_BASE}/api/v1/products/slug/${encodeURIComponent(slugParam)}`)
    ?? await fetchJSON(`${API_BASE}/api/v1/products/${encodeURIComponent(slugParam)}`);

  if (!p) return { title: "Sản phẩm | Dola Bakery" };

  const title = `${p.name} | Dola Bakery`;
  let desc = p.description;
  if (!desc && p.content_html) desc = p.content_html.replace(/<[^>]*>/g, "").slice(0, 180);
  if (!desc) desc = `Thưởng thức ${p.name} thơm ngon, tươi mới từ Dola Bakery.`;
  const img = normImg(p.thumbnail || p.image || "/slide1.jpg");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  const canonicalSlug = p.slug || slugParam;

  return {
    title,
    description: desc.slice(0, 180),
    alternates: { canonical: `${siteUrl}/product/${canonicalSlug}` },
    openGraph: {
      title,
      description: desc.slice(0, 180),
      images: [{ url: img, width: 800, height: 600, alt: p.name }],
      url: `${siteUrl}/product/${canonicalSlug}`,
    },
    twitter: { card: "summary_large_image", title, description: desc.slice(0, 180), images: [img] },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const slugParam = String(slug || "").trim();

  const rawProduct = await fetchJSON(`${API_BASE}/api/v1/products/slug/${encodeURIComponent(slugParam)}`)
    ?? await fetchJSON(`${API_BASE}/api/v1/products/${encodeURIComponent(slugParam)}`);
  if (!rawProduct) notFound();

  const product = normalizeProductForSSR(rawProduct);
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const variantsForUI = variants.filter(
    (v) => v && (v.status === undefined || v.status === null || Number(v.status) === 1)
  );
  const primaryVariant = variantsForUI.find((v) => Number(v.is_default ?? 0) === 1) ?? variantsForUI[0] ?? null;

  const priceBuy = primaryVariant ? Number(primaryVariant.price ?? product.price_buy ?? 0) : Number(product.price_buy ?? 0);
  let saleCandidate = null;
  if (product.product_sale && isSaleActive(product.product_sale)) {
    saleCandidate = Number(product.product_sale.price_sale ?? 0);
  } else {
    saleCandidate = primaryVariant ? Number(primaryVariant.price_sale ?? 0) : Number(product.price_sale ?? 0);
  }
  const priceSale = saleCandidate > 0 && saleCandidate < priceBuy ? saleCandidate : null;

  const gallery = [product.thumbnail || product.image || "/slide1.jpg", ...(Array.isArray(product.images) ? product.images : [])]
    .filter(Boolean)
    .map((img) => normImg(typeof img === "string" ? img : img.image || img.url || img.src || ""));

  let related = [];
  if (product?.category?.slug) {
    const rel = await fetchJSON(
      `${API_BASE}/api/v1/products?category_slug=${encodeURIComponent(product.category.slug)}&status=1&per_page=12&sort=created_desc`
    );
    related = Array.isArray(rel?.data) ? rel.data.filter((x) => x.id !== product.id).map(normalizeProductForSSR) : [];
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  const productSlug = product.slug || slugParam;
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: gallery.length ? gallery : [normImg(product.thumbnail || product.image || "/slide1.jpg")],
    description: product.description || "",
    sku: String(product.id),
    category: product?.category?.name || "Bánh - Đồ nướng",
    offers: {
      "@type": "Offer",
      priceCurrency: "VND",
      price: String(priceSale || priceBuy || 0),
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/product/${productSlug}`,
    },
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Sản phẩm", item: `${siteUrl}/product` },
      { "@type": "ListItem", position: 3, name: product.name, item: `${siteUrl}/product/${productSlug}` },
    ],
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <Script id="ld-product" type="application/ld+json">{JSON.stringify(productLd)}</Script>
      <Script id="ld-breadcrumbs" type="application/ld+json">{JSON.stringify(breadcrumbsLd)}</Script>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-5">
          <Gallery images={gallery} name={product.name} />
        </div>

        <div className="md:col-span-7">
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-[22px] md:text-3xl font-extrabold text-amber-700 flex-1">{product.name}</h1>
            <ProductFavoriteButton productId={product.id} className="rounded-full bg-white/90 p-2 hover:scale-110 transition-transform ml-4 shadow" />
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 text-sm text-gray-700">
            {product?.category?.name && (
              <>
                <span className="opacity-70">Loại:</span>
                <Link href={`/product?category=${product.category.slug}`} className="text-amber-700 hover:underline font-medium">
                  {product.category.name}
                </Link>
                <span className="opacity-60">|</span>
              </>
            )}
            <span>
              Tình trạng:{" "}
              {product?.available_quantity > 0 ? (
                <b className="text-green-600">Còn hàng ({product.available_quantity} sản phẩm)</b>
              ) : (
                <b className="text-red-600">Hết hàng</b>
              )}
            </span>
          </div>

          <VariantPricingBox
            apiBase={API_BASE}
            productId={product.id}
            productName={product.name}
            productThumb={product.thumbnail || product.image || "/slide1.jpg"}
            variants={variantsForUI}
            fallbackPriceBuy={priceBuy}
            fallbackPriceSale={priceSale ?? 0}
            productAvailableQuantity={product.available_quantity || 0}
            productInStock={product.is_in_stock !== false}
          />

          <ProductCoupons productId={product.id} categoryId={product.category?.id} />
        </div>
      </div>

      <section className="mt-8">
        <div className="prose max-w-none">
          {product.description ? <p className="text-gray-700 whitespace-pre-line">{product.description}</p> : <p className="text-gray-500">Chưa có mô tả ngắn.</p>}
        </div>
        <div className="prose max-w-none mt-6 border-t pt-4">
          {(product.content_html || product.content) ? (
            <div className="text-gray-700 prose-p:leading-7" dangerouslySetInnerHTML={{ __html: product.content_html || product.content }} />
          ) : (
            <p className="text-gray-500">Chưa có mô tả chi tiết.</p>
          )}
        </div>
      </section>

      <ProductReviewsSection product={product} />

      {related.length > 0 && (
        <section className="mt-14 mb-10 py-8 bg-white border-y border-amber-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4" role="list">
              {related.map((it) => (
                <RelatedProductCard key={`related-${it.id}`} product={it} />
              ))}
            </div>
          </div>
        </section>
      )}

      <RecentlyViewed me={product} />
    </main>
  );
}
