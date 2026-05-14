/**
 * Service quản lý favorites - Hỗ trợ cả localStorage và API
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const TOKEN_KEY = "auth_token";
const FAVORITES_LOCAL_KEY = "favorites_local";

/**
 * Lấy danh sách favorites từ localStorage
 */
export function getLocalFavorites() {
  try {
    const stored = localStorage.getItem(FAVORITES_LOCAL_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Lưu danh sách favorites vào localStorage
 */
export function saveLocalFavorites(productIds) {
  try {
    localStorage.setItem(FAVORITES_LOCAL_KEY, JSON.stringify(productIds));
    return true;
  } catch {
    return false;
  }
}

/**
 * Thêm product vào favorites localStorage
 */
export function addToLocalFavorites(productId) {
  const favorites = getLocalFavorites();
  const id = Number(productId);
  if (!favorites.includes(id)) {
    favorites.push(id);
    saveLocalFavorites(favorites);
    return true;
  }
  return false;
}

/**
 * Xóa product khỏi favorites localStorage
 */
export function removeFromLocalFavorites(productId) {
  const favorites = getLocalFavorites();
  const id = Number(productId);
  const filtered = favorites.filter((favId) => favId !== id);
  if (filtered.length !== favorites.length) {
    saveLocalFavorites(filtered);
    return true;
  }
  return false;
}

/**
 * Kiểm tra product có trong favorites localStorage không
 */
export function isInLocalFavorites(productId) {
  const favorites = getLocalFavorites();
  return favorites.includes(Number(productId));
}

/**
 * Kiểm tra user đã đăng nhập chưa
 */
export function isLoggedIn() {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem(TOKEN_KEY);
  return !!token;
}

/**
 * Lấy token từ localStorage
 */
export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Đồng bộ favorites từ localStorage lên server
 * Gọi khi user đăng nhập
 */
export async function syncLocalFavoritesToServer() {
  const token = getToken();
  if (!token) return { success: false, message: "Chưa đăng nhập" };

  const localFavorites = getLocalFavorites();
  if (localFavorites.length === 0) {
    // Xóa localStorage nếu đã đồng bộ xong
    localStorage.removeItem(FAVORITES_LOCAL_KEY);
    return { success: true, message: "Không có favorites cần đồng bộ" };
  }

  try {
    // Lấy danh sách favorites từ server
    const res = await fetch(`${API_BASE}/api/v1/favorites`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return { success: false, message: "Không thể tải favorites từ server" };
    }

    const data = await res.json();
    // API trả về paginated response: { data: [...], current_page, ... }
    // Mỗi favorite item có structure: { id, user_id, product_id, product: {...} }
    const favoritesList = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    const serverFavorites = favoritesList.map((fav) => {
      // Ưu tiên product_id, sau đó là product.id
      return Number(fav.product_id || fav.product?.id || null);
    }).filter(id => id > 0);

    // Thêm các favorites từ localStorage (chưa có trên server) lên server
    const toAdd = localFavorites.filter((id) => !serverFavorites.includes(id));
    let successCount = 0;
    let failCount = 0;

    for (const productId of toAdd) {
      try {
        const toggleRes = await fetch(`${API_BASE}/api/v1/favorites/toggle`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ product_id: productId }),
        });

        if (toggleRes.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    // Xóa localStorage sau khi đồng bộ xong
    if (successCount > 0 || failCount === 0) {
      localStorage.removeItem(FAVORITES_LOCAL_KEY);
    }

    return {
      success: true,
      message: `Đã đồng bộ ${successCount} sản phẩm yêu thích`,
      successCount,
      failCount,
    };
  } catch (error) {
    console.error("Sync favorites error:", error);
    return { success: false, message: "Lỗi khi đồng bộ favorites" };
  }
}

/**
 * Toggle favorite trên server (dùng khi đã đăng nhập)
 */
export async function toggleFavoriteOnServer(productId) {
  const token = getToken();
  if (!token) {
    return { success: false, message: "Chưa đăng nhập", isFavorite: false };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/favorites/toggle`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ product_id: productId }),
    });

    if (!res.ok) {
      return { success: false, message: "Không thể cập nhật yêu thích", isFavorite: false };
    }

    const data = await res.json();
    return {
      success: true,
      message: data.is_favorite ? "Đã thêm vào yêu thích" : "Đã xóa khỏi yêu thích",
      isFavorite: data.is_favorite,
    };
  } catch (error) {
    console.error("Toggle favorite error:", error);
    return { success: false, message: "Lỗi khi cập nhật yêu thích", isFavorite: false };
  }
}

/**
 * Kiểm tra favorite status từ server
 */
export async function checkFavoriteOnServer(productIds) {
  const token = getToken();
  if (!token) {
    return { favorites: [] };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/favorites/check`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ product_ids: Array.isArray(productIds) ? productIds : [productIds] }),
    });

    if (!res.ok) {
      return { favorites: [] };
    }

    const data = await res.json();
    return { favorites: data.favorites || [] };
  } catch (error) {
    console.error("Check favorite error:", error);
    return { favorites: [] };
  }
}

