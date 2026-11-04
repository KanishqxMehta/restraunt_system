import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Isocode | Restaurant ordering",
  description: "Direct ordering and kitchen operations for Company A.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
