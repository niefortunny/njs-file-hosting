import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Doba",
  description: "Anonimowy hosting plików. Plik żyje 24 godziny, a potem znika.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line">
          <div className="mx-auto flex w-full max-w-xl items-baseline justify-between px-5 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Doba
            </Link>
            <p className="text-sm text-muted">plik na 24 godziny</p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-xl flex-1 px-5 py-12">{children}</main>
      </body>
    </html>
  );
}
