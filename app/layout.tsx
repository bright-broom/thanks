import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "契約後39メール生成",
  description: "Human in the Loop 型 契約後メール生成・確認管理システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
