import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Brand } from '@/components/Brand'
import { onboardingSteps } from '@/features/onboarding/flow'
export function OnboardingLayout() {
  const { pathname } = useLocation()
  const step = Math.max(onboardingSteps.indexOf(pathname as (typeof onboardingSteps)[number]), 0)
  const progress = ((step + 1) / onboardingSteps.length) * 100

  return (
    <main className="min-h-screen ambient">
      <div className="mx-auto max-w-360 px-5 py-5 md:px-10 md:py-8">
        <div className="flex items-center justify-between">
          <Brand />
          <span className="text-xs font-semibold text-forest/65">Step {step + 1} of {onboardingSteps.length}</span>
        </div>
        <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-forest/10">
          <div className="h-full rounded-full bg-nuraa transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-8 grid min-h-[calc(100vh-150px)] items-center gap-10 lg:grid-cols-[minmax(250px,.8fr)_minmax(460px,1fr)]">
          <section className="hidden lg:block">
            <Link to={step ? onboardingSteps[step - 1] : '/'} className="inline-flex items-center gap-2 text-sm font-semibold text-nuraa"><ArrowLeft size={16} /> Back</Link>
            <p className="mt-12 text-xs font-bold uppercase tracking-[.14em] text-nuraa">Nuraa onboarding</p>
            <h1 className="display mt-4 max-w-sm text-5xl leading-[.95] text-forest">A foundation that fits your life.</h1>
            <p className="mt-6 max-w-xs text-base leading-7 text-ink/65">A few thoughtful details now help Nuraa become more useful when you are ready.</p>
            <div className="mt-12 rounded-[28px] border border-white/80 bg-white/62 p-6 shadow-[0_18px_44px_rgba(22,52,47,.07)] backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-sage text-nuraa"><ShieldCheck size={22} /></span>
                <span className="text-sm font-bold text-forest">{Math.round(progress)}%</span>
              </div>
              <p className="mt-5 text-sm font-semibold text-forest">Private by design</p>
              <p className="mt-1 text-sm leading-6 text-ink/60">Your details are used only to personalise your Nuraa experience.</p>
              <div className="mt-5 grid gap-2 text-sm text-forest/72">
                {['Profile context', 'Daily readiness', 'Clear controls'].map((item) => (
                  <p key={item} className="flex items-center gap-2"><Check size={15} className="text-nuraa" /> {item}</p>
                ))}
              </div>
            </div>
          </section>
          <section><Outlet /></section>
        </div>
      </div>
    </main>
  )
}
