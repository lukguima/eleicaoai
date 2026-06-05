import Link from 'next/link'
import LandingNav from '@/components/LandingNav'
import BentoFeatures from '@/components/BentoFeatures'
import { createServerClient } from '@/lib/supabase'

interface HeroContent { badge: string; title: string; subtitle: string }
interface DbProduct { type: string; label: string; price: number }

const DEFAULT_HERO: HeroContent = {
  badge: '✅ Simples, rápido e dentro da lei',
  title: 'Produza o material\nda sua campanha',
  subtitle: 'Santinhos, banners, jingles e posts personalizados com IA em menos de 2 minutos. Rótulo TSE incluído automaticamente — sem precisar de designer.',
}

async function getPageData(): Promise<{ hero: HeroContent; dbProducts: DbProduct[] }> {
  try {
    const supabase = createServerClient()
    const [heroResult, productsResult] = await Promise.all([
      supabase.from('site_content').select('value').eq('key', 'hero').single(),
      supabase.from('products').select('type, label, price').eq('active', true),
    ])
    return {
      hero: (heroResult.data?.value as HeroContent) ?? DEFAULT_HERO,
      dbProducts: (productsResult.data as DbProduct[]) ?? [],
    }
  } catch {
    return { hero: DEFAULT_HERO, dbProducts: [] }
  }
}

const DEFAULT_SERVICES = [
  { type: 'santinho',  label: 'Santinho Digital',        price: 29, icon: '🗳️' },
  { type: 'banner',   label: 'Banner / Placa',           price: 29, icon: '📋' },
  { type: 'perfurado',label: 'Adesivo Perfurado',        price: 39, icon: '🚗' },
  { type: 'social',   label: 'Post para Redes Sociais',  price: 19, icon: '📱' },
  { type: 'jingle',   label: 'Jingle Profissional',      price: 49, icon: '🎵' },
]

const TESTIMONIALS = [
  {
    name: 'João Souza',
    role: 'Candidato a Vereador · São Paulo, SP',
    quote: 'Gerei meu santinho em menos de 3 minutos. Antes levava uma semana com o designer e pagava muito mais caro.',
  },
  {
    name: 'Fernanda Lima',
    role: 'Candidata a Prefeita · Belo Horizonte, MG',
    quote: 'O jingle ficou excelente — melhor do que eu esperava. A campanha ganhou identidade que nenhum adversário tinha.',
  },
  {
    name: 'Carlos Mendes',
    role: 'Coordenador de Campanha · Curitiba, PR',
    quote: 'Gerencio vários candidatos ao mesmo tempo. Rápido, profissional e 100% dentro da lei eleitoral.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Informe os dados',
    desc: 'Nome, número, partido e cores da campanha. O processo leva menos de 2 minutos.',
  },
  {
    n: '02',
    title: 'A IA gera o material',
    desc: 'Santinho, banner, jingle ou post criado automaticamente com identidade visual profissional.',
  },
  {
    n: '03',
    title: 'Baixe e use',
    desc: 'Arquivo pronto com rótulo TSE incluído. Conforme a Resolução nº 23.732/2024.',
  },
]

export default async function HomePage() {
  const { hero, dbProducts } = await getPageData()

  const services = DEFAULT_SERVICES.map(s => {
    const db = dbProducts.find(p => p.type === s.type)
    return { ...s, label: db?.label ?? s.label, price: db ? Math.round(db.price / 100) : s.price }
  }).filter(s => dbProducts.length === 0 || dbProducts.some(p => p.type === s.type))

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface font-sans antialiased">
      <LandingNav />

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative bg-primary-container overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 0% 100%, rgba(37,106,73,0.20) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 100% 0%, rgba(255,223,158,0.10) 0%, transparent 55%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32 grid md:grid-cols-2 items-center gap-12">
          {/* Copy */}
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-on-secondary rounded-full text-xs font-semibold uppercase tracking-wider">
              {hero.badge}
            </span>

            <h1 className="font-headline text-5xl md:text-6xl font-bold text-white leading-[1.08] tracking-tight">
              {hero.title.split('\n').map((line, i, arr) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {i === arr.length - 1
                    ? <span className="text-tertiary-fixed">{line}</span>
                    : line}
                </span>
              ))}
            </h1>

            <p className="text-on-primary-container text-lg leading-relaxed max-w-[36rem]">
              {hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/order/santinho"
                className="inline-flex items-center justify-center gap-2 bg-tertiary-fixed text-on-tertiary-fixed px-8 py-4 rounded-xl font-headline font-bold text-base shadow-lg hover:brightness-110 transition-all"
              >
                Criar meu material agora →
              </Link>
              <a
                href="#precos"
                className="inline-flex items-center justify-center gap-2 border-2 border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-white/10 transition-all"
              >
                Ver serviços e preços
              </a>
            </div>
          </div>

          {/* Mockup card */}
          <div className="hidden md:flex justify-center">
            <div className="relative w-full max-w-[360px]">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-2xl space-y-4">
                {/* Candidate header */}
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-sm shrink-0">
                    LS
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">Lucas Silva · Vereador</p>
                    <p className="text-white/50 text-xs">Nº 2222 · Partido</p>
                  </div>
                  <span className="bg-secondary/30 text-secondary-container text-xs px-2 py-1 rounded-full shrink-0">✅ Ativo</span>
                </div>

                {/* Material list */}
                <div className="space-y-2">
                  {[
                    { icon: '🗳️', label: 'Santinho Digital', status: 'done' },
                    { icon: '🎵', label: 'Jingle',           status: 'done' },
                    { icon: '📋', label: 'Banner',           status: 'processing' },
                    { icon: '📱', label: 'Post Instagram',   status: 'pending' },
                  ].map(item => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                        item.status === 'done'       ? 'bg-secondary/20 text-white'
                        : item.status === 'processing' ? 'bg-white/10 text-white/70'
                        :                               'bg-white/5 text-white/40'
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span className="flex-1 font-medium">{item.label}</span>
                      {item.status === 'done'       && <span className="text-secondary-container text-xs">✓</span>}
                      {item.status === 'processing' && <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white/80 animate-spin shrink-0" />}
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div className="bg-secondary/20 border border-secondary/30 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-secondary-container text-xs font-semibold">Gerando banner…</p>
                    <span className="text-white/40 text-xs">75%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-1.5 bg-secondary w-3/4 rounded-full" />
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-3 -right-3 bg-tertiary-fixed text-on-tertiary-fixed text-xs font-bold px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
                ✓ Res. TSE 23.732/2024
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { n: '< 2 min', label: 'tempo de geração' },
              { n: '5',       label: 'tipos de material' },
              { n: '100%',    label: 'conforme Res. TSE' },
              { n: 'R$ 599',  label: 'combo completo' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-tertiary-fixed font-headline font-bold text-2xl">{s.n}</p>
                <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENTO FEATURES ──────────────────────────────────────── */}
      <BentoFeatures services={services} />

      {/* ── COMO FUNCIONA ───────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary">
              Três passos para ter seu material
            </h2>
            <p className="text-on-surface-variant mt-3 text-lg">
              Simples como deve ser. Sem software, sem designer, sem espera.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-outline-variant" />
            {STEPS.map((step, i) => (
              <div key={i} className="flex flex-col gap-5">
                <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg z-10 shrink-0">
                  <span className="font-headline font-bold text-2xl text-tertiary-fixed">{step.n}</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-xl text-primary">{step.title}</h3>
                  <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── CONFORMIDADE TSE ────────────────────────────────────── */}
      <section className="py-20 bg-surface-container-low">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-5 py-2 rounded-full text-sm font-semibold">
            ✅ 100% conforme com a lei eleitoral brasileira
          </div>
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary">
            Dentro da lei, sempre
          </h2>
          <p className="text-on-surface-variant leading-relaxed text-lg max-w-2xl mx-auto">
            A Resolução TSE nº 23.732/2024 exige que todo material gerado por inteligência artificial exiba o rótulo{' '}
            <strong className="text-on-surface">&ldquo;Conteúdo fabricado com IA&rdquo;</strong>{' '}
            e o CNPJ da campanha. O EleiçãoAI faz isso automaticamente em todos os materiais.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 text-left mt-10">
            {[
              { icon: '🏷️', title: 'Rótulo automático',  desc: '"Conteúdo fabricado com IA" aplicado em todos os materiais visuais gerados.' },
              { icon: '🏢', title: 'CNPJ incorporado',   desc: 'O CNPJ da sua campanha é inserido conforme Art. 9º-B §2 da Resolução.' },
              { icon: '📋', title: 'Atualizado em 2024', desc: 'Todas as exigências da Resolução TSE nº 23.732/2024 já estão implementadas.' },
            ].map(c => (
              <div key={c.title} className="bg-white rounded-2xl border border-outline-variant p-6">
                <span className="text-3xl">{c.icon}</span>
                <h4 className="font-headline font-bold text-primary mt-3 mb-1">{c.title}</h4>
                <p className="text-on-surface-variant text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ─────────────────────────────────────────── */}
      <section id="depoimentos" className="py-24 max-w-7xl mx-auto px-6">
        <h2 className="font-headline text-3xl md:text-4xl font-bold text-center text-primary mb-16">
          Quem já usa o EleiçãoAI
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => (
            <div
              key={t.name}
              className="bg-white rounded-2xl border border-outline-variant p-8 flex flex-col gap-5 hover:shadow-lg transition-all italic text-on-surface-variant"
            >
              <div className="flex gap-1 not-italic">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#fabd00">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <p className="leading-relaxed flex-grow">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3 pt-2 border-t border-outline-variant not-italic">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-sm shrink-0">
                  {t.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-primary text-sm">{t.name}</p>
                  <p className="text-on-surface-variant text-xs mt-0.5">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="bg-primary-container text-white py-14 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 pb-10 border-b border-white/10">
            <div className="md:col-span-2">
              <p className="font-headline font-bold text-2xl">
                Eleição<span className="text-secondary-container">AI</span>
              </p>
              <p className="text-white/40 text-sm mt-3 leading-relaxed max-w-[20rem]">
                Materiais eleitorais gerados com inteligência artificial. Conformidade automática com o TSE desde 2024.
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4 text-white/70 uppercase tracking-wider">Serviços</p>
              <ul className="space-y-2.5">
                {services.map(s => (
                  <li key={s.type}>
                    <Link href={`/order/${s.type}`} className="text-white/40 text-sm hover:text-white transition-colors">
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4 text-white/70 uppercase tracking-wider">Legal</p>
              <ul className="space-y-2.5 text-white/40 text-sm">
                <li>Resolução TSE 23.732/2024</li>
                <li>Política de privacidade</li>
                <li>Termos de uso</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white/25 text-xs">
            <p>© 2024 EleiçãoAI. Todos os direitos reservados.</p>
            <p>Todos os materiais incluem rótulo TSE obrigatório de IA</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
