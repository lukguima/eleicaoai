import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://eleicaoai.com.br'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'EleiçãoAI — Materiais eleitorais com IA',
    template: '%s | EleiçãoAI',
  },
  description:
    'Gere santinhos, banners, adesivos perfurados, posts para redes sociais e jingles com inteligência artificial. Conformidade automática com a Resolução TSE nº 23.732/2024.',
  keywords: [
    'material eleitoral', 'santinho eleitoral', 'jingle eleitoral', 'banner eleitoral',
    'inteligência artificial eleições', 'TSE resolução 23.732', 'campanha política IA',
  ],
  authors: [{ name: 'EleiçãoAI' }],
  creator: 'EleiçãoAI',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: 'EleiçãoAI',
    title: 'EleiçãoAI — Materiais eleitorais com IA',
    description:
      'Santinhos, banners e jingles gerados com IA em minutos. 100% conforme a Res. TSE 23.732/2024.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'EleiçãoAI' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EleiçãoAI — Materiais eleitorais com IA',
    description: 'Santinhos, banners e jingles gerados com IA. Conforme TSE.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${montserrat.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

