"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isLoggedIn,
  isInLocalFavorites,
  addToLocalFavorites,
  removeFromLocalFavorites,
  toggleFavoriteOnServer,
  checkFavoriteOnServer,
} from "@/utils/favoritesService";

export default function FavoriteButton({ productId, className = "", onToggle, showToast }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);

  // Kiểm tra trạng thái đăng nhập và favorite
  useEffect(() => {
    const checkStatus = () => {
      const loggedIn = isLoggedIn();
      setUserLoggedIn(loggedIn);

      if (loggedIn) {
        // Nếu đã đăng nhập, kiểm tra từ server
        checkFavoriteOnServer(productId).then((result) => {
          setIsFavorite(result.favorites?.includes(Number(productId)) || false);
        });
      } else {
        // Nếu chưa đăng nhập, kiểm tra từ localStorage
        setIsFavorite(isInLocalFavorites(productId));
      }
    };

    checkStatus();

    // Lắng nghe sự kiện đăng nhập/đăng xuất
    const handleAuthChange = () => {
      checkStatus();
    };
    const handleStorageChange = () => {
      // Kiểm tra lại trạng thái đăng nhập mỗi lần
      const loggedIn = isLoggedIn();
      if (!loggedIn) {
        setIsFavorite(isInLocalFavorites(productId));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("auth-changed", handleAuthChange);

    // Lắng nghe sự kiện favorite được cập nhật từ component khác
    const handleFavoriteUpdated = (e) => {
      if (e.detail?.productId === productId) {
        setIsFavorite(e.detail.isFavorite);
      }
    };

    window.addEventListener("favorite-updated", handleFavoriteUpdated);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth-changed", handleAuthChange);
      window.removeEventListener("favorite-updated", handleFavoriteUpdated);
    };
  }, [productId]); // Removed userLoggedIn from deps to avoid infinite loop

  const handleToggle = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();

      setLoading(true);
      const newFavoriteState = !isFavorite;

      try {
        if (userLoggedIn) {
          // Đã đăng nhập: cập nhật trên server
          const result = await toggleFavoriteOnServer(productId);
          if (result.success) {
            setIsFavorite(result.isFavorite);
            showToast?.(
              result.isFavorite
                ? "❤️ Đã thêm vào danh sách yêu thích"
                : "💔 Đã xóa khỏi danh sách yêu thích",
              "success"
            );

            // Dispatch event để update UI ở nơi khác
            window.dispatchEvent(
              new CustomEvent("favorite-updated", {
                detail: { productId, isFavorite: result.isFavorite },
              })
            );
          } else {
            showToast?.("Có lỗi xảy ra. Vui lòng thử lại.", "error");
          }
        } else {
          // Chưa đăng nhập: lưu vào localStorage
          if (newFavoriteState) {
            addToLocalFavorites(productId);
            showToast?.("❤️ Đã lưu vào yêu thích (sẽ đồng bộ khi đăng nhập)", "info");
          } else {
            removeFromLocalFavorites(productId);
            showToast?.("💔 Đã xóa khỏi yêu thích", "info");
          }
          setIsFavorite(newFavoriteState);

          // Dispatch event
          window.dispatchEvent(
            new CustomEvent("favorite-updated", {
              detail: { productId, isFavorite: newFavoriteState },
            })
          );

          // Dispatch storage event để các tab khác cũng cập nhật
          window.dispatchEvent(new Event("storage"));
        }

        // Gọi callback nếu có
        onToggle?.(newFavoriteState);
      } catch (err) {
        console.error("Toggle favorite error:", err);
        showToast?.("Có lỗi xảy ra. Vui lòng thử lại.", "error");
      } finally {
        setLoading(false);
      }
    },
    [isFavorite, userLoggedIn, productId, onToggle, showToast]
  );

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={
        className ||
        "rounded-full bg-white/90 p-1 hover:scale-110 transition-transform disabled:opacity-50"
      }
      title={
        loading
          ? "Đang xử lý..."
          : isFavorite
          ? "Bỏ yêu thích"
          : userLoggedIn
          ? "Thêm vào yêu thích"
          : "Thêm vào yêu thích (sẽ lưu tạm)"
      }
      aria-label="Yêu thích"
    >
      {loading ? (
        <svg
          className="animate-spin"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
          <path
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={isFavorite ? "currentColor" : "none"}
          className="transition-transform duration-300 group-hover:scale-110"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      )}
    </button>
  );
}


