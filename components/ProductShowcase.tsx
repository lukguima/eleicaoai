const WAVEFORM = [4, 7, 5, 9, 6, 8, 4, 10, 7, 5, 8, 6, 9, 5, 7]

function SantinhoCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-40 border border-white/10">
      <div
        className="h-28 flex flex-col items-end justify-between p-3"
        style={{ background: 'linear-gradient(155deg, #0a1b3d 0%, #1a3a7a 60%, #256a49 100%)' }}
      >
        <div className="self-start flex items-center gap-1.5 bg-white/15 rounded-full px-2 py-0.5">
          <span className="text-[10px]">🗳️</span>
          <span className="text-white/70 text-[9px] font-semibold uppercase tracking-wider">Vote</span>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-[10px] uppercase tracking-widest">Vereador</p>
          <p className="font-headline font-black text-4xl leading-none" style={{ color: '#ffdf9e' }}>5544</p>
        </div>
      </div>
      <div className="bg-primary p-3 text-center">
        <p className="text-white font-bold text-xs tracking-wide uppercase leading-tight">João Mendes</p>
        <p className="text-white/50 text-xs mt-0.5">Progressistas · São Paulo</p>
      </div>
      <div className="bg-gray-100 px-2 py-1 text-center">
        <p className="text-gray-400 text-[9px] leading-tight">Conteúdo fabricado com IA · CNPJ 00.000.000/0001-00</p>
      </div>
    </div>
  )
}

function BannerCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-2xl w-52 border border-white/10">
      <div
        className="px-5 py-4 flex flex-col items-center text-center"
        style={{ background: 'linear-gradient(135deg, #256a49 0%, #0a1b3d 100%)' }}
      >
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">Vote</p>
        <p className="font-headline font-black text-4xl leading-none" style={{ color: '#ffdf9e' }}>5544</p>
        <p className="text-white font-bold text-sm mt-1 uppercase tracking-wide">João Mendes</p>
        <p className="text-white/50 text-xs">Vereador · Sua cidade, seu futuro</p>
      </div>
      <div className="bg-gray-100 px-2 py-1 text-center">
        <p className="text-gray-400 text-[9px]">Conteúdo fabricado com IA</p>
      </div>
    </div>
  )
}

function SocialCard() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl w-40 border border-white/10">
      <div
        className="aspect-square flex flex-col items-start justify-between p-4"
        style={{ background: 'linear-gradient(135deg, #4f0789 0%, #0a1b3d 60%, #256a49 100%)' }}
      >
        <div className="flex gap-1 w-full">
          <div className="flex-1 h-1 rounded-full bg-white/40" />
          <div className="flex-1 h-1 rounded-full bg-white/20" />
          <div className="flex-1 h-1 rounded-full bg-white/20" />
        </div>
        <div>
          <p className="font-headline font-black text-3xl leading-none" style={{ color: '#ffdf9e' }}>5544</p>
          <p className="text-white font-bold text-xs uppercase tracking-wide mt-1">João Mendes</p>
          <p className="text-white/50 text-[10px] mt-0.5 italic">Sua cidade, seu futuro</p>
        </div>
      </div>
      <div className="bg-gray-100 px-2 py-1 text-center">
        <p className="text-gray-400 text-[9px]">Conteúdo fabricado com IA</p>
      </div>
    </div>
  )
}

function JingleCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-2xl w-52 border border-white/10">
      <div className="bg-gray-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-base">🎵</div>
          <div>
            <p className="text-white text-xs font-bold leading-tight">Jingle Sertanejo</p>
            <p className="text-white/40 text-[10px]">João Mendes 2024</p>
          </div>
        </div>
        {/* Waveform */}
        <div className="flex items-end gap-px h-10 mb-3">
          {WAVEFORM.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full"
              style={{
                height: `${h * 4}px`,
                background: 'linear-gradient(180deg, #a8efc5 0%, #256a49 100%)',
                animation: `waveBar ${0.6 + (i % 5) * 0.15}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.05}s`,
                transformOrigin: 'bottom',
              }}
            />
          ))}
        </div>
        {/* Controls */}
        <div className="flex items-center justify-between">
          <span className="text-white/30 text-[10px]">0:00</span>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shadow-lg shadow-secondary/30">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="text-white/30 text-[10px]">1:45</span>
        </div>
      </div>
      <div className="bg-gray-100 px-2 py-1 text-center">
        <p className="text-gray-400 text-[9px]">Conteúdo fabricado com IA</p>
      </div>
    </div>
  )
}

export default function ProductShowcase() {
  return (
    <section className="py-28 overflow-hidden relative" style={{ background: 'linear-gradient(180deg, #0a1b3d 0%, #000109 100%)' }}>
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 50% 50%, rgba(37,106,73,0.14) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 80% 20%, rgba(255,223,158,0.07) 0%, transparent 50%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-20">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 text-white/70 rounded-full text-xs font-semibold uppercase tracking-wider mb-5">
            ✨ Exemplos reais gerados pela IA
          </span>
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-white">
            Veja o que você pode criar
          </h2>
          <p className="text-white/40 mt-3 text-lg">
            Materiais profissionais personalizados com os dados reais da sua campanha
          </p>
        </div>

        {/* Floating cards */}
        <div className="flex flex-wrap justify-center items-end gap-8 md:gap-12">

          {/* Santinho — inclina para a esquerda */}
          <div className="float-1" style={{ transform: 'rotate(-5deg)' }}>
            <div className="relative">
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-container text-white/70 text-[10px] font-semibold px-3 py-1 rounded-full whitespace-nowrap border border-white/10"
              >
                🗳️ Santinho Digital
              </div>
              <SantinhoCard />
            </div>
          </div>

          {/* Banner — inclinado para direita, maior */}
          <div className="float-2 hidden sm:block" style={{ transform: 'rotate(2deg)' }}>
            <div className="relative">
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-container text-white/70 text-[10px] font-semibold px-3 py-1 rounded-full whitespace-nowrap border border-white/10"
              >
                📋 Banner / Placa
              </div>
              <BannerCard />
            </div>
          </div>

          {/* Social post — centralizado, sem rotação */}
          <div className="float-3" style={{ transform: 'rotate(-2deg)' }}>
            <div className="relative">
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-container text-white/70 text-[10px] font-semibold px-3 py-1 rounded-full whitespace-nowrap border border-white/10"
              >
                📱 Post Social
              </div>
              <SocialCard />
            </div>
          </div>

          {/* Jingle — inclina para direita */}
          <div className="float-4 hidden sm:block" style={{ transform: 'rotate(4deg)' }}>
            <div className="relative">
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-container text-white/70 text-[10px] font-semibold px-3 py-1 rounded-full whitespace-nowrap border border-white/10"
              >
                🎵 Jingle Profissional
              </div>
              <JingleCard />
            </div>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-16">
          Exemplos ilustrativos · Seu material será criado com os dados reais da campanha
        </p>
      </div>
    </section>
  )
}
