import Link from 'next/link'

export default function PaymentFailurePage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-outline-variant p-8 text-center w-full" style={{ maxWidth: '26rem' }}>
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-red-400" style={{ fontSize: '2rem' }}>cancel</span>
        </div>
        <h1 className="text-xl font-bold text-on-surface mb-2">Pagamento recusado</h1>
        <p className="text-on-surface-variant text-sm mb-6">
          Seu pagamento não foi aprovado. Verifique os dados do cartão e tente novamente, ou escolha outra forma de pagamento.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="block text-center py-3 px-6 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Tentar novamente
          </Link>
          <Link href="/dashboard" className="text-sm text-on-surface-variant hover:text-on-surface transition-colors">
            Ir para o painel
          </Link>
        </div>
      </div>
    </div>
  )
}
