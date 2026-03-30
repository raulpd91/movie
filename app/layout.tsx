import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movie Tracker Skill",
  description: "Track movies with TMDB metadata, Notion sync, and dynamic OG cards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
