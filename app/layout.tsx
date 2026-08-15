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

function safeSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://eleicaoai.com.br').trim()
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    return new URL(withProto).origin
  } catch {
    return 'https://eleicaoai.com.br'
  }
}
const SITE_URL = safeSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'EleiçãoAI — Materiais eleitorais com IA',
    template: '%s | EleiçãoAI',
  },
  description:
    'Gere santinhos, banners, stories, colinha e jingles com inteligência artificial. Conformidade automática com a Resolução TSE nº 23.755/2026.',
  keywords: [
    'material eleitoral', 'santinho eleitoral', 'jingle eleitoral', 'banner eleitoral',
    'inteligência artificial eleições', 'TSE resolução 23.755', 'campanha política IA',
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
      'Santinhos, banners e jingles gerados com IA em minutos. 100% conforme a Res. TSE 23.755/2026.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'EleiçãoAI' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EleiçãoAI — Materiais eleitorais com IA',
    description: 'Santinhos, banners e jingles gerados com IA. Conforme TSE.',
    images: ['/og-image.png'],
  },
};

export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publicEnv = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  }
  return (
    <html
      lang="pt-BR"
      className={`${montserrat.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ELEICAO_PUBLIC__=${JSON.stringify(publicEnv)}`,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}

