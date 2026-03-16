import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "@/app/css/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Infera AI Agent",
  description: "AI Agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Script
          src="https://avatars.labskit.ru/did-sdk/v2/index.js"
          data-mode="full"
          data-client-key="Z29vZ2xlLW9hdXRoMnwxMDcwNzg4NzgxMDI0ODU2Nzc4Mjc6RnBkelluWlEzREJKTE1JZjZIa3V5"
          data-agent-id="v2_agt_ODP2-9pe"
          data-name="did-agent"
          data-monitor="true"
          type="module"
        />
      </body>
    </html>
  );
}
