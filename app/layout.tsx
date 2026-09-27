import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Happy Family — A little more together",
  description: "Your family finances, thoughtfully organized.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
