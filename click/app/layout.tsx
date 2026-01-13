import type { Metadata } from "next";
import { GlobalDataProvider } from "./contexts/GlobalDataContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Click Cafe OS",
  description: "High-density cafe management system",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Click Cafe OS" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="screen-orientation" content="landscape" />
        <meta name="x5-orientation" content="landscape" />
        <meta name="x5-page-mode" content="app" />
        <meta name="browsermode" content="application" />
      </head>
      <body className="antialiased overflow-hidden overflow-x-hidden h-screen w-screen" style={{ touchAction: 'pan-y' }}>
        <GlobalDataProvider>
          {children}
        </GlobalDataProvider>
      </body>
    </html>
  );
}
