import { redirect } from "next/navigation";

export const metadata = {
  title: "Đổi mật khẩu | Dola Bakery",
};

export default function ChangePasswordPage() {
  redirect("/profile");
}
