import { useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Baby, CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useChildMode } from '@/hooks/useChildMode'
import { cn } from '@/lib/utils'

type ChildModeControlVariant = 'icon' | 'pill' | 'banner'
type DialogStep = 'closed' | 'enable' | 'exit'

interface ChildModeControlProps {
  variant?: ChildModeControlVariant
  className?: string
}

export function ChildModeControl({ variant = 'pill', className }: ChildModeControlProps) {
  const { t } = useTranslation()
  const { enabled, isPreview, enable, disable } = useChildMode()
  const [step, setStep] = useState<DialogStep>('closed')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const open = () => {
    setPin('')
    setError('')
    setStep(enabled ? 'exit' : 'enable')
  }

  const close = () => {
    setStep('closed')
    setPin('')
    setError('')
  }

  const onPinChange = (value: string) => {
    setPin(value.replace(/\D/g, '').slice(0, 4))
    setError('')
  }

  const submitEnable = () => {
    if (!/^\d{4}$/.test(pin)) {
      setError(t('child.pin_invalid'))
      return
    }
    if (enable(pin)) close()
    else setError(t('child.pin_invalid'))
  }

  const submitExit = () => {
    if (!/^\d{4}$/.test(pin)) {
      setError(t('child.pin_invalid'))
      return
    }
    if (disable(pin)) close()
    else setError(t('child.pin_error'))
  }

  const onEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    if (step === 'enable') submitEnable()
    if (step === 'exit') submitExit()
  }

  const trigger = variant === 'banner'
    ? enabled
      ? (
        <div className={cn('border-b border-amber-400/30 bg-amber-100/80 px-4 py-2 text-charcoal-900', className)}>
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold leading-5">
              <ShieldCheck size={14} className="shrink-0 text-amber-500" />
              {t('child.banner')}
            </span>
            <button onClick={open} className="shrink-0 rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-charcoal-700 transition hover:bg-white">
              {t('child.exit_action')}
            </button>
          </div>
        </div>
      )
      : null
    : (
      <button
        onClick={open}
        aria-label={enabled ? t('child.enabled') : t('child.enable')}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-bold transition',
          variant === 'icon'
            ? cn(
              'h-11 w-11 rounded-xl border bg-white text-charcoal-900 hover:border-chili-500/30 hover:bg-chili-50',
              enabled ? 'border-amber-400/40 bg-amber-50' : 'border-charcoal-900/10',
            )
            : cn(
              'rounded-full border px-4 py-2 text-sm shadow-sm',
              enabled ? 'border-amber-400/40 bg-amber-100 text-charcoal-900' : 'border-chili-500/20 bg-white/90 text-chili-600 hover:bg-chili-50',
            ),
          className,
        )}
      >
        {enabled
          ? <ShieldCheck size={variant === 'icon' ? 18 : 16} className="text-amber-500" />
          : <Baby size={variant === 'icon' ? 18 : 16} />}
        {variant === 'pill' && (enabled ? t('child.enabled') : t('child.enable'))}
      </button>
    )

  return (
    <>
      {trigger}
      <Dialog open={step !== 'closed'} onOpenChange={(next) => { if (!next) close() }}>
        <DialogContent title={step === 'enable' ? t('child.enable_title') : t('child.exit_title')}>
          {step === 'enable' && (
            <>
              <p className="mt-2 text-sm leading-6 text-charcoal-500">{t('child.enable_desc')}</p>
              <ul className="mt-4 space-y-2 rounded-2xl bg-white p-4 text-sm text-charcoal-700">
                {['enable_item_1', 'enable_item_2', 'enable_item_3', 'enable_item_4'].map((key) => (
                  <li key={key} className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                    {t(`child.${key}`)}
                  </li>
                ))}
              </ul>
              <PinField label={t('child.pin_label')} value={pin} onChange={onPinChange} onEnter={onEnter} />
              {error && <p className="mt-2 text-sm font-semibold text-chili-600">{error}</p>}
              <div className="mt-5 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={close}>{t('child.cancel')}</Button>
                <Button className="flex-1" onClick={submitEnable}><LockKeyhole size={16} />{t('child.confirm_enable')}</Button>
              </div>
            </>
          )}
          {step === 'exit' && (
            <>
              <p className="mt-2 text-sm leading-6 text-charcoal-500">{t('child.exit_desc')}</p>
              <div className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-100/70 p-3 text-xs leading-5 text-charcoal-700">
                <KeyRound size={15} className="mt-0.5 shrink-0 text-amber-500" />
                {t('child.forgot')}
              </div>
              <PinField label={t('child.pin_label_exit')} value={pin} onChange={onPinChange} onEnter={onEnter} />
              {error && <p className="mt-2 text-sm font-semibold text-chili-600">{error}</p>}
              {isPreview && <p className="mt-2 text-xs font-semibold text-amber-500">{t('child.preview_pin_hint')}</p>}
              <div className="mt-5 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={close}>{t('child.cancel')}</Button>
                <Button className="flex-1" onClick={submitExit}><ShieldCheck size={16} />{t('child.confirm_exit')}</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function PinField({ label, value, onChange, onEnter }: {
  label: string
  value: string
  onChange: (value: string) => void
  onEnter: (event: KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <label className="mt-5 block">
      <span className="text-sm font-bold text-charcoal-900">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onEnter}
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        maxLength={4}
        placeholder="••••"
        aria-label={label}
        className="mt-2 h-12 w-full rounded-xl border border-charcoal-900/10 bg-white text-center text-2xl font-extrabold tracking-[0.5em] text-charcoal-900 outline-none transition focus:border-chili-500/40 focus:ring-4 focus:ring-chili-50"
      />
    </label>
  )
}
