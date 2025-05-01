import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const desc = "Swedish — Personal Identifiable Information (PII) — Detection & Masking"

export const metadata: Metadata = {
  title: desc,
  description: desc + " in text",
  icons: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🕵️</text></svg>",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
