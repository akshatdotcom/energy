import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

export const metadata: Metadata = {
  title: "AeroCharge | AI EV Fleet Load Management",
  description:
    "AeroCharge eliminates EV demand charges with AI-powered load balancing. Real-time allocation across your entire fleet — zero stranded vehicles, maximum savings.",
  keywords: ["EV fleet", "demand charge management", "load balancing", "EV charging", "fleet electrification"],
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} font-sans bg-[#030712]`}>{children}</body>
    </html>
  );
}
