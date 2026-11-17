import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ChildModeCheckoutBlocked({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-10">
      <section className="w-full rounded-3xl bg-white p-7 text-center shadow-float">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-500">
          <ShieldCheck size={38} />
        </span>
        <h1 className="mt-6 text-2xl font-extrabold text-charcoal-900">{t('child.checkout_blocked_title')}</h1>
        <p className="mt-3 leading-7 text-charcoal-500">{t('child.checkout_blocked_desc')}</p>
        <Button onClick={onBack} variant="outline" className="mt-6 w-full">{t('checkout.back')}</Button>
      </section>
    </main>
  )
}
