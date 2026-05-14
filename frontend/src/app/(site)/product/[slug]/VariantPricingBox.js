"use client";

import { useEffect, useMemo, useState } from "react";
import AddToCartButtons from "./AddToCartButtons";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatVND(value) {
  return toNumber(value).toLocaleString("vi-VN") + "₫";
}

export default function VariantPricingBox({
  productId,
  productName,
  productThumb,
  variants = [],
  apiBase,
  fallbackPriceBuy = 0,
  fallbackPriceSale = 0,
  productAvailableQuantity = 0,
  productInStock = true,
}) {
  const normalizedVariants = useMemo(() => {
    return variants
      .filter((v) => v && (v.status === undefined || v.status === null || Number(v.status) === 1))
      .map((v) => ({
        ...v,
        price: toNumber(v.price),
        price_sale: toNumber(v.price_sale),
        effective_price: toNumber(v.effective_price, toNumber(v.price)),
        stock: (() => {
          const raw =
            v.stock === null || v.stock === undefined || v.stock === ""
              ? null
              : Math.max(0, Math.floor(Number(v.stock)));
          if (raw === 0 && productAvailableQuantity > 0) return null;
          return raw;
        })(),
        weight_gram:
          v.weight_gram === null || v.weight_gram === undefined || v.weight_gram === ""
            ? null
            : Math.max(0, Math.floor(Number(v.weight_gram))),
        sort_order: Math.max(0, Math.floor(Number(v.sort_order ?? 0))),
        is_default: Number(v.is_default ?? 0) === 1,
      }))
      .sort((a, b) => {
        if (Number(b.is_default) - Number(a.is_default) !== 0) {
          return Number(b.is_default) - Number(a.is_default);
        }
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return toNumber(a.id) - toNumber(b.id);
      });
  }, [variants, productAvailableQuantity]);

  const isOutOfStock = (variant) => variant.stock !== null && variant.stock <= 0;
  const firstSelectable = useMemo(() => {
    if (!normalizedVariants.length) return null;
    return normalizedVariants.find((variant) => !isOutOfStock(variant)) ?? normalizedVariants[0];
  }, [normalizedVariants]);

  const [selectedId, setSelectedId] = useState(firstSelectable?.id ?? null);

  useEffect(() => {
    if (!normalizedVariants.length) {
      setSelectedId(null);
      return;
    }
    const stillExists = normalizedVariants.some((variant) => variant.id === selectedId && !isOutOfStock(variant));
    if (stillExists) return;
    setSelectedId(firstSelectable?.id ?? normalizedVariants[0]?.id ?? null);
  }, [normalizedVariants, selectedId, firstSelectable]);

  const selectedVariant = normalizedVariants.find((v) => v.id === selectedId) ?? null;

  const basePrice = selectedVariant ? selectedVariant.price : toNumber(fallbackPriceBuy);
  const salePrice = selectedVariant
    ? selectedVariant.price_sale > 0 && selectedVariant.price_sale < selectedVariant.price
      ? selectedVariant.price_sale
      : null
    : fallbackPriceSale > 0 && fallbackPriceSale < fallbackPriceBuy
      ? toNumber(fallbackPriceSale)
      : null;

  const discount = salePrice
    ? Math.max(0, Math.round(100 - (salePrice / (basePrice || 1)) * 100))
    : 0;

  const availableQuantity = selectedVariant && selectedVariant.stock !== null
    ? selectedVariant.stock
    : productAvailableQuantity;

  const isInStock = selectedVariant
    ? selectedVariant.stock === null
      ? productInStock
      : selectedVariant.stock > 0
    : productInStock;

  return (
    <div>
      <div className="flex items-end gap-3 mb-4">
        {salePrice ? (
          <>
            <span className="text-[28px] md:text-3xl font-bold text-amber-700">
              {formatVND(salePrice)}
            </span>
            <del className="text-gray-400 text-lg">{formatVND(basePrice)}</del>
            {discount > 0 && (
              <span className="px-2 py-1 text-xs rounded bg-red-600 text-white">
                -{discount}%
              </span>
            )}
          </>
        ) : (
          <span className="text-[28px] md:text-3xl font-bold text-amber-700">
            {formatVND(basePrice)}
          </span>
        )}
      </div>

      {normalizedVariants.length > 0 && (
        <div className="mb-5">
          <div className="text-sm font-semibold text-gray-700 mb-2">Chọn size / khối lượng</div>
          <div className="flex flex-wrap gap-2">
            {normalizedVariants.map((variant) => {
              const active = variant.id === selectedId;
              const outOfStock = isOutOfStock(variant);
              const displayWeight = variant.weight_gram
                ? `${variant.weight_gram}g`
                : (variant.name || "Size");
              return (
                <button
                  key={variant.id}
                  onClick={() => {
                    if (outOfStock) return;
                    setSelectedId(variant.id);
                  }}
                  type="button"
                  disabled={outOfStock}
                  className={`relative min-w-[110px] rounded-lg border px-3 py-2 text-center shadow-sm transition-all ${
                    outOfStock
                      ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                      : active
                        ? "border-amber-600 bg-amber-600 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-amber-400 hover:text-amber-700"
                  }`}
                >
                  <div className="text-sm font-semibold truncate">{displayWeight}</div>
                  {outOfStock && (
                    <span className="mt-1 inline-block rounded bg-gray-300 px-2 py-0.5 text-[11px] text-gray-700">
                      Hết hàng
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-amber-50/50 p-4 mb-4">
        <div className="text-sm text-gray-600 mb-2">Số lượng</div>
        <AddToCartButtons
          apiBase={apiBase}
          productId={productId}
          priceBuy={basePrice}
          priceSale={salePrice}
          productName={productName}
          productThumb={productThumb}
          availableQuantity={availableQuantity}
          isInStock={isInStock}
          variant={selectedVariant}
        />
      </div>
    </div>
  );
}
