// src/app/(site)/profile/page.js
import ProfileClient from "@/components/ProfileClient";

export const metadata = {
  title: "Hồ sơ | Dola Bakery",
  description: "Trang hồ sơ cá nhân của bạn tại Dola Bakery.",
};

export default function ProfilePage() {
  // Server wrapper: bảo vệ & UI, sự kiện… ở client component
  return <ProfileClient />;
}
