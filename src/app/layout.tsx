import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: "Report Sol - Sistema de Informes",
  description: "Plataforma para la gestión y seguimiento de informes de grupos de trabajo",
  applicationName: "Report Sol",
  authors: [{ name: "Report Sol Team" }],
  generator: "Next.js",
  keywords: ["informes", "reportes", "gestión", "grupos", "trabajo", "seguimiento"],
  
  // Open Graph para Facebook y otras redes
  openGraph: {
    title: "Report Sol - Sistema de Informes",
    description: "Plataforma para la gestión y seguimiento de informes de grupos de trabajo",
    url: "/",
    siteName: "Report Sol",
    images: [
      {
        url: "/opengraph-report-sol.jpg",
        width: 1200,
        height: 630,
        alt: "Report Sol - Sistema de Informes",
      }
    ],
    locale: "es_ES",
    type: "website",
  },
  
  // Twitter Cards
  twitter: {
    card: "summary_large_image",
    title: "Report Sol - Sistema de Informes",
    description: "Plataforma para la gestión y seguimiento de informes de grupos de trabajo",
    images: ["/opengraph-report-sol.jpg"],
    creator: "@reportsolapp",
    site: "@reportsolapp",
  },
  
  // Configuración para otras redes
  other: {
    "fb:app_id": "123456789",
    "og:site_name": "Report Sol",
    "og:email": "contacto@reportsol.com",
  },
  
  // Iconos
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png" }
    ],
    apple: "/icon.png",
    shortcut: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
