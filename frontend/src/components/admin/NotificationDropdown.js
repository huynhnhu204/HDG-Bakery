"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const ADMIN_TOKEN_KEY = "admin_token";

async function fetchNotifications(token, limit = 20) {
  const url = `${BASE}${API}/admin/notifications?limit=${limit}`;
  console.log("NotificationDropdown: Fetching from:", url);
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  console.log("NotificationDropdown: Response status:", res.status, res.statusText);
  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    console.error("NotificationDropdown: API error response:", errorText);
    throw new Error(`Failed to fetch notifications: ${res.status} ${res.statusText} - ${errorText}`);
  }
  const data = await res.json();
  console.log("NotificationDropdown: Parsed response:", data);
  return data;
}

async function markAsRead(token, notificationId) {
  const res = await fetch(`${BASE}${API}/admin/notifications/${notificationId}/read`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to mark as read");
  return res.json();
}

async function markAllAsRead(token) {
  const res = await fetch(`${BASE}${API}/admin/notifications/read-all`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to mark all as read");
  return res.json();
}

export default function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;

  const loadNotifications = async () => {
    if (!token) {
      console.warn("NotificationDropdown: No token found");
      return;
    }
    try {
      setLoading(true);
      console.log("NotificationDropdown: Fetching notifications...");
      const data = await fetchNotifications(token, 10);
      console.log("NotificationDropdown: Received data:", data);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error("NotificationDropdown: Failed to load notifications:", error);
      // Set empty arrays on error to avoid showing stale data
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    
    // Load initially
    loadNotifications();

    // Poll every 30 seconds for new notifications
    const interval = setInterval(loadNotifications, 30000);

    return () => clearInterval(interval);
  }, [token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read && token) {
      try {
        await markAsRead(token, notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }

    setIsOpen(false);
    if (notification.url) {
      router.push(notification.url);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      await markAllAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "order":
        return "🛒";
      case "contact":
        return "📧";
      case "review":
        return "⭐";
      default:
        return "🔔";
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className="relative h-9 w-9 rounded-full hover:bg-orange-50 flex items-center justify-center text-xl transition"
        aria-label="Thông báo"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 md:w-96 bg-white border rounded-lg shadow-lg z-50 max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                <div className="inline-block h-5 w-5 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                <div className="mt-2">Đang tải...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <div className="text-4xl mb-2">🔕</div>
                <div>Không có thông báo</div>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors ${
                      !notification.is_read ? "bg-orange-50/50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm font-medium ${
                              !notification.is_read ? "text-gray-900" : "text-gray-700"
                            }`}
                          >
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <span className="flex-shrink-0 h-2 w-2 bg-orange-500 rounded-full mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/admin/notifications");
                }}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                Xem tất cả
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


