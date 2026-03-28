import type { Metadata } from "next";
import { EB_Garamond, Lora } from "next/font/google";
import "./globals.css";

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "ScrubRef",
  description: "Surgical knowledge, instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${garamond.variable} ${lora.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-papyrus text-ink">
        {children}
      </body>
    </html>
  );
}
