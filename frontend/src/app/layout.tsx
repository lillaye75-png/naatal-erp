import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Naatal ERP Cloud",
  description: "L'ERP que l'Afrique mérite. Gérez votre entreprise depuis votre téléphone.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-full antialiased">
        <a href="#main-content" className="skip-to-content">
          Aller au contenu principal
        </a>
        {children}
      </body>
    </html>
  );
}