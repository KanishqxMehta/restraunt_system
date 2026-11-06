import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Restaurant System | Company A · Royal Kitchens of Hyderabad",
  description:
    "Authentic slow-cooked Hyderabadi Dum Biryani, direct bulk handi catering, and live kitchen operations for Company A.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col selection:bg-[#ead9f5] selection:text-[#2b0e35]">
        {children}
      </body>
    </html>
  );
}
