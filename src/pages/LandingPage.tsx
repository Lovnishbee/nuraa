import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Activity, BrainCircuit, CalendarDays, Check, ChevronRight, CirclePlay, Dumbbell, HeartPulse, Leaf, Menu, ShieldCheck, Sparkles, Target, Utensils, Watch, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from '@/components/Brand'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScoreRing } from '@/components/ScoreRing'
import heroPhone from '@/assets/hero-phone.png'
import testimonialPortraits from '@/assets/testimonial-portraits.png'
import { cn } from '@/lib/utils'

type NavigationItem = { label: string; href: string | null }

const navItems: NavigationItem[] = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Nuraa Score', href: '#nuraa-score' },
  { label: 'AI Coach', href: '#ai-coach' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '#footer' },
]

const problemCards: { icon: LucideIcon; title: string; copy: string; accent?: boolean }[] = [
  { icon: Dumbbell, title: 'Fitness Apps', copy: 'Track workouts.' },
  { icon: Utensils, title: 'Nutrition Apps', copy: 'Track calories.' },
  { icon: Watch, title: 'Wearables', copy: 'Track sleep.' },
  { icon: Sparkles, title: 'Nuraa', copy: 'Connects everything. And tells you what matters today.', accent: true },
]

const features: { id?: string; icon: LucideIcon; title: string; copy: string }[] = [
  { icon: Sparkles, title: 'Nuraa Score', copy: 'Daily readiness score from 0–100 based on your body and life.' },
  { id: 'ai-coach', icon: BrainCircuit, title: 'AI Coach', copy: 'Ask anything. Get personalised answers powered by your health data.' },
  { icon: Utensils, title: 'Nutrition Intelligence', copy: 'Smart meal logging, macro tracking, and personalised nutrition insights.' },
  { icon: Dumbbell, title: 'Adaptive Workouts', copy: 'Workouts that adapt to your energy, schedule, and recovery readiness.' },
  { icon: Activity, title: 'Progress Tracking', copy: 'Track trends that matter and see your progress over time.' },
  { id: 'health-reports', icon: HeartPulse, title: 'Health Reports', copy: 'Upload a report to get AI-powered insights and clear explanations.' },
]

const footerLinkGroups: { title: string; links: NavigationItem[] }[] = [
  { title: 'Product', links: [navItems[1], navItems[2], navItems[3], { label: 'Health Reports', href: '#health-reports' }, navItems[4]] },
  { title: 'Company', links: [{ label: 'About Us', href: '#footer' }, { label: 'Science', href: null }, { label: 'Blog', href: null }, { label: 'Careers', href: null }, { label: 'Contact', href: null }] },
  { title: 'Support', links: [{ label: 'Help Center', href: null }, { label: 'Privacy Policy', href: null }, { label: 'Terms of Use', href: null }, { label: 'Security', href: null }, { label: 'Accessibility', href: null }] },
]

const testimonials = [
  ['Priya S.', 'Product Manager, 29', '“Nuraa tells me what my body needs each day. It’s like having a health expert who knows me personally.”', '-38px'],
  ['Arjun M.', 'Entrepreneur, 34', '“The Nuraa Score keeps me consistent and helps me make smarter choices every single day.”', '-128px'],
  ['Neha R.', 'Consultant, 31', '“Finally, an app that connects everything — sleep, food, workouts, and my real life — and actually guides me.”', '-302px'],
] as const

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  return <div className="landing-page overflow-x-hidden bg-canvas text-ink">
    <header className="glass-header relative z-20 mx-3 flex max-w-[1400px] items-center justify-between px-5 py-5 sm:mx-auto sm:px-8 lg:px-12 lg:py-5">
      <Brand />
      <nav className="hidden items-center gap-7 text-sm font-bold text-forest/85 lg:flex" aria-label="Main navigation">
        {navItems.map(({ label, href }) => <a key={label} href={href ?? undefined} className="transition hover:text-nuraa focus-visible:text-nuraa">{label}</a>)}
      </nav>
      <div className="hidden lg:block"><Button asChild size="sm" className="min-h-11 rounded-2xl px-5 text-base"><Link to="/register">Get My Nuraa Score</Link></Button></div>
      <button type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="grid size-11 place-items-center rounded-2xl border border-forest/10 bg-white text-forest lg:hidden">{menuOpen ? <X size={20} /> : <Menu size={21} />}</button>
      {menuOpen && <div className="glass-surface absolute inset-x-2 top-[76px] rounded-3xl p-4 shadow-xl lg:hidden"><nav className="grid gap-1" aria-label="Mobile navigation">{navItems.map(({ label, href }) => <a key={label} href={href ?? undefined} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3 text-base font-bold text-forest hover:bg-sage">{label}</a>)}<Button asChild className="mt-2 text-base" onClick={() => setMenuOpen(false)}><Link to="/register">Get My Nuraa Score</Link></Button></nav></div>}
    </header>

    <main>
      <section id="nuraa-score" className="landing-grid relative mx-auto grid max-w-[1400px] items-center gap-12 px-5 pb-20 pt-13 sm:px-8 sm:pt-18 lg:grid-cols-[.92fr_1.08fr] lg:px-12 lg:pb-28 lg:pt-22">
        <div className="relative z-10 max-w-[570px]">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-sage px-3 py-1.5 text-[11px] font-bold tracking-[.03em] text-nuraa"><Sparkles size={13} /> AI-POWERED HEALTH INTELLIGENCE</p>
          <h1 className="display mt-5 max-w-[540px] text-[46px] leading-[.98] text-forest sm:text-6xl lg:text-[75px]">Your health<br /> should adapt to<br /> <em className="text-nuraa">your life.</em></h1>
          <p className="mt-6 max-w-[525px] text-base leading-7 text-ink/85 lg:text-lg lg:leading-8">Nuraa combines sleep, nutrition, activity, recovery, travel, and schedule intelligence to tell you exactly what your body needs today.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="w-full sm:w-auto"><Link to="/register">Get My Nuraa Score</Link></Button><Button asChild variant="outline" size="lg" className="w-full sm:w-auto"><a href="#how-it-works">Watch Demo <CirclePlay size={18} /></a></Button></div>
          <div className="mt-10 grid max-w-[610px] grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">{[['AI', 'Personalised', 'Adapts to your life'], ['Privacy', 'First', 'Your data stays yours'], ['Science', 'Backed', 'Evidence-based guidance'], ['Works Anywhere', '', 'Web, iOS & Android']].map(([title, strong, copy]) => <div key={title} className="flex gap-2"><Check className="mt-0.5 shrink-0 text-nuraa" size={17} strokeWidth={2.4} /><div><p className="text-sm font-bold text-forest">{title}</p>{strong && <p className="text-[13px] font-semibold text-forest/85">{strong}</p>}<p className="text-[13px] leading-5 text-ink/70">{copy}</p></div></div>)}</div>
        </div>
        <HeroScorePreview />
      </section>

      <section className="mx-auto max-w-[1340px] px-5 py-16 sm:px-8 lg:px-12 lg:py-22">
        <SectionLabel>THE PROBLEM</SectionLabel>
        <h2 className="display mx-auto mt-4 max-w-2xl text-center text-[42px] leading-tight text-forest sm:text-5xl">Most health apps track data.<br />Few give direction.</h2>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">{problemCards.map(({ icon: Icon, title, copy, accent }) => <Card key={title} className={cn('relative min-h-50 overflow-hidden p-6 text-center', accent ? 'border-nuraa bg-forest shadow-[0_20px_42px_rgba(14,118,110,.32)] lg:-translate-y-3' : 'glass-surface')}>
          {accent && <><span className="absolute -right-10 -top-12 size-36 rounded-full bg-nuraa/60 blur-3xl" /><span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#9bd4c4] to-transparent" /><span className="relative inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-bold tracking-[.12em] text-[#bde9db]">THE NURAA DIFFERENCE</span></>}
          <div className={cn('relative mx-auto grid size-12 place-items-center rounded-2xl', accent ? 'mt-3 bg-white text-nuraa shadow-lg' : 'bg-sage text-nuraa')}><Icon size={25} strokeWidth={1.8} /></div><h3 className={cn('relative mt-5 text-base font-bold', accent ? 'text-white' : 'text-forest')}>{title}</h3><p className={cn('relative mx-auto mt-2 max-w-44 text-sm leading-6', accent ? 'text-white/88' : 'text-ink/75')}>{copy}</p>{accent && <span className="relative mt-4 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[.12em] text-[#d7f4e9]">One clear direction <ChevronRight size={14} /></span>}</Card>)}</div>
      </section>

      <section id="how-it-works" className="glass-band my-5 border-y border-forest/8 px-5 py-16 sm:px-8 lg:my-8 lg:px-12 lg:py-22">
        <SectionLabel>HOW NURAA WORKS</SectionLabel>
        <h2 className="display mx-auto mt-4 max-w-3xl text-center text-[42px] text-forest sm:text-5xl">AI-powered. Science-backed.<br className="sm:hidden" /> Built around you.</h2>
        <div className="mx-auto mt-12 max-w-6xl"><div className="hidden h-px bg-nuraa/30 md:block" /><div className="grid gap-8 md:-mt-4 md:grid-cols-5">{[[UserIcon, '1. You share your data', 'We learn about your body, habits, goals, and schedule.'], [LayersIcon, '2. We analyze everything', 'Our AI analyzes sleep, nutrition, recovery, travel, and more.'], [BrainIcon, '3. Nuraa Score is calculated', 'Get your daily readiness score from 0–100.'], [ReportIcon, '4. You get your plan', 'Personalized guidance on nutrition, workouts, recovery, and focus.'], [TrendIcon, '5. You improve every day', 'Your score improves as your habits improve.']].map(([Icon, title, copy]) => { const StepIcon = Icon as typeof UserIcon; return <article key={title as string} className="relative text-center"><span className="mx-auto grid size-14 place-items-center rounded-full border border-nuraa/20 bg-sage text-nuraa"><StepIcon size={23} /></span><h3 className="mt-5 text-sm font-bold text-forest">{title as string}</h3><p className="mx-auto mt-2 max-w-44 text-sm leading-6 text-ink/72">{copy as string}</p></article>})}</div></div>
      </section>

      <section id="features" className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-12 lg:py-22">
        <SectionLabel>POWERFUL FEATURES</SectionLabel>
        <h2 className="display mt-4 text-center text-[42px] text-forest sm:text-5xl">Everything you need. One intelligent system.</h2>
        <div className="mt-11 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{features.map(({ id, icon: Icon, title, copy }) => <Card id={id} key={title} className="glass-surface min-h-64 p-5"><span className="grid size-11 place-items-center rounded-2xl bg-sage/75 text-nuraa"><Icon size={20} /></span><h3 className="mt-6 text-base font-bold text-forest">{title}</h3><p className="mt-2 text-sm leading-6 text-ink/75">{copy}</p></Card>)}</div>
      </section>

      <PricingSection />

      <ResultsSection />

      <section className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-12 lg:py-22">
        <SectionLabel>LOVED BY USERS</SectionLabel>
        <h2 className="display mt-4 text-center text-[42px] text-forest sm:text-5xl">Real people. Real results.</h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">{testimonials.map(([name, role, quote, portraitOffset]) => <Card key={name} className="glass-surface p-6"><div className="flex items-start gap-4"><span className="testimonial-portrait size-14 shrink-0 rounded-full ring-2 ring-sage" style={{ backgroundImage: `url(${testimonialPortraits})`, backgroundPositionX: portraitOffset }} /><p className="text-base leading-7 text-ink/85">{quote}</p></div><p className="mt-5 text-base font-bold text-forest">{name}</p><p className="mt-1 text-sm text-ink/70">{role}</p></Card>)}</div><div className="mt-6 flex justify-center gap-2"><span className="size-2 rounded-full bg-nuraa" /><span className="size-2 rounded-full bg-forest/20" /><span className="size-2 rounded-full bg-forest/20" /></div>
      </section>

      <section id="cta" className="mx-auto max-w-[1400px] px-5 pb-16 sm:px-8 lg:px-12 lg:pb-22"><div className="overflow-hidden rounded-[32px] bg-forest px-6 py-9 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-13"><div className="flex items-center gap-5"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-white"><Leaf size={27} /></span><div><h2 className="display text-3xl sm:text-4xl">Ready to understand your body better?</h2><p className="mt-1 text-sm text-white/70">Get your Nuraa Score in under 60 seconds.</p></div></div><div className="mt-7 flex flex-wrap gap-3 lg:mt-0"><Button asChild variant="secondary" size="lg"><Link to="/register">Get My Nuraa Score</Link></Button><Button asChild variant="outline" size="lg" className="border-white/55 text-white hover:bg-white hover:text-forest"><a href="#how-it-works">Watch Demo <CirclePlay size={18} /></a></Button></div></div></section>
    </main>
    <Footer />
  </div>
}

function HeroScorePreview() { return <div className="relative mx-auto w-full max-w-[700px]"><div className="absolute -left-10 top-10 hidden size-48 rounded-full bg-sand/45 blur-3xl sm:block" /><Card className="glass-surface relative mx-auto max-w-[590px] p-5 sm:p-7"><p className="relative text-xs font-bold tracking-wide text-forest">NURAA SCORE</p><div className="relative mt-5 grid items-center gap-5 sm:grid-cols-[235px_1fr]"><ScoreRing score={78} className="mx-auto w-48 sm:w-52" /><div><p className="max-w-44 text-lg font-semibold leading-7 text-forest">You slept well but have a packed schedule.</p><p className="mt-6 text-xs font-bold text-forest">Today’s Focus</p><ul className="mt-3 space-y-2.5 text-sm text-ink/78"><Focus>20-min workout</Focus><Focus>110g protein</Focus><Focus>2.8L hydration</Focus></ul></div></div><div className="relative mt-6 rounded-2xl bg-forest p-5 text-white"><div className="flex items-center justify-between"><p className="text-xs font-bold tracking-wide">TODAY’S BRIEF <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-white/85">AI GENERATED</span></p><ChevronRight size={16} /></div><p className="mt-3 max-w-[420px] text-base leading-7 text-white/92">Your body is ready to perform, but your schedule is intense. Fuel well, stay hydrated, and protect your energy this afternoon.</p><p className="mt-4 flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} /> Focus: Energy & Performance</p></div></Card><PhonePreview /></div> }
function PhonePreview() { return <img src={heroPhone} alt="Nuraa Score on a mobile phone" className="absolute -right-8 -top-22 hidden w-57 drop-shadow-2xl xl:block" /> }
function PricingSection() { return <section id="pricing" className="glass-band my-5 border-y border-forest/8 px-5 py-16 sm:px-8 lg:my-8 lg:px-12 lg:py-22"><SectionLabel>MEMBERSHIP</SectionLabel><h2 className="display mx-auto mt-4 max-w-3xl text-center text-[42px] leading-tight text-forest sm:text-5xl">Start with what your body needs today.</h2><p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-ink/78 lg:text-lg">Begin with a private health foundation now. Nuraa Pro will add deeper adaptive guidance when it is ready.</p><div className="mx-auto mt-11 grid max-w-4xl gap-5 md:grid-cols-2"><Card className="glass-surface p-7 sm:p-8"><p className="text-xs font-bold tracking-[.12em] text-nuraa">AVAILABLE NOW</p><h3 className="display mt-4 text-4xl text-forest">Nuraa Free</h3><p className="mt-2 text-lg font-bold text-forest">Free forever</p><p className="mt-5 max-w-sm text-base leading-7 text-ink/78">Build your health foundation and see your first Nuraa readiness placeholder.</p><ul className="mt-7 space-y-3 text-sm leading-6 text-ink/82"><PlanFeature>Personal profile and health foundation</PlanFeature><PlanFeature>Goals, lifestyle, and nutrition preferences</PlanFeature><PlanFeature>Private dashboard and profile shell</PlanFeature><PlanFeature>Readiness score setup state</PlanFeature></ul><Button asChild size="lg" className="mt-8 w-full"><Link to="/register">Get started free</Link></Button></Card><Card className="relative overflow-hidden border border-nuraa bg-forest p-7 text-white shadow-[0_24px_54px_rgba(14,118,110,.32)] sm:p-8"><span className="absolute -right-10 -top-12 size-44 rounded-full bg-nuraa/65 blur-3xl" /><span className="relative inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold tracking-[.12em] text-[#d7f4e9]">COMING SOON</span><h3 className="display relative mt-4 text-4xl">Nuraa Pro</h3><p className="relative mt-2 text-lg font-bold text-white">Adaptive guidance, when it matters.</p><p className="relative mt-5 max-w-sm text-base leading-7 text-white/86">A future membership for fuller context across your life, without adding checkout to Phase 1.</p><ul className="relative mt-7 space-y-3 text-sm leading-6 text-white/88"><PlanFeature inverse>More personalised daily guidance</PlanFeature><PlanFeature inverse>Deeper progress and readiness insights</PlanFeature><PlanFeature inverse>Connected-life experiences as they launch</PlanFeature><PlanFeature inverse>Clear, privacy-first control over your data</PlanFeature></ul><Button asChild variant="secondary" size="lg" className="relative mt-8 w-full border-white/30 bg-white text-forest hover:bg-sage"><Link to="/register">Start with Nuraa Free</Link></Button><p className="relative mt-4 text-center text-sm text-white/72">No payment details or checkout required.</p></Card></div></section> }
function PlanFeature({ children, inverse = false }: { children: React.ReactNode; inverse?: boolean }) { return <li className="flex items-start gap-3"><Check className={cn('mt-1 shrink-0', inverse ? 'text-[#a6e4d1]' : 'text-nuraa')} size={16} strokeWidth={3} /><span>{children}</span></li> }
function ResultsSection() { return <section className="mx-auto max-w-[1400px] px-5 py-4 sm:px-8 lg:px-12"><div className="relative overflow-hidden rounded-[34px] bg-forest px-7 py-10 text-white sm:px-10 lg:grid lg:min-h-89 lg:grid-cols-[.74fr_1.26fr] lg:items-center lg:px-16"><div className="absolute -left-14 -bottom-14 size-72 rounded-full border-[24px] border-white/10" /><div className="relative hidden lg:block"><img src={heroPhone} alt="Nuraa Score mobile app" className="mx-auto -my-13 w-60 rotate-[-12deg] drop-shadow-2xl" /></div><div className="relative"><h2 className="display max-w-xl text-[42px] leading-tight sm:text-5xl">Personalized guidance.<br />Proven impact.</h2><div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">{[['78%', 'Users feel more in control of their health'], ['2.4x', 'Better consistency with personalised guidance'], ['90%', 'Say Nuraa helps them make better daily choices'], ['4.8★', 'Average user rating']].map(([value, copy]) => <div key={value}><p className="font-serif text-4xl text-white">{value}</p><p className="mt-2 text-sm leading-5 text-white/80">{copy}</p></div>)}</div><p className="mt-8 text-base text-white/90">Join thousands taking control of their health with Nuraa.</p></div></div></section> }
function Footer() { return <footer id="footer" className="bg-[#063b35] px-5 py-12 text-white sm:px-8 lg:px-12"><div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.25fr]"><div><Brand className="text-white [&_span:last-child]:text-white" /><p className="mt-5 max-w-55 text-base leading-7 text-white/82">AI-powered health intelligence that adapts to your life and helps you feel your best self.</p><div className="mt-6 flex gap-2"><Social>ig</Social><Social>in</Social><Social>𝕏</Social><Social>▶</Social></div></div>{footerLinkGroups.map(({ title, links }) => <FooterLinks key={title} title={title} links={links} />)}<div className="rounded-2xl border border-white/15 p-5"><p className="text-base font-semibold">Get the app</p><p className="mt-1 text-sm leading-6 text-white/75">Available on iOS and Android</p><div className="mt-5 flex gap-2"><span className="rounded-md bg-black px-3 py-2 text-[11px] font-semibold">App Store</span><span className="rounded-md bg-black px-3 py-2 text-[11px] font-semibold">Google Play</span></div></div></div><div className="mx-auto mt-10 flex max-w-[1400px] flex-col justify-between gap-2 border-t border-white/10 pt-6 text-sm text-white/70 sm:flex-row"><span>© 2025 Nuraa. All rights reserved.</span><span>Made with <span className="text-rose-300">♥</span> for your health</span></div></footer> }
function SectionLabel({ children }: { children: React.ReactNode }) { return <p className="glass-chip mx-auto w-fit rounded-full px-3 py-1 text-[11px] font-bold tracking-[.04em] text-nuraa">{children}</p> }
function Focus({ children }: { children: React.ReactNode }) { return <li className="flex items-center gap-2"><Check className="text-nuraa" size={15} strokeWidth={3} />{children}</li> }
function FooterLinks({ title, links }: { title: string; links: NavigationItem[] }) { return <div><h2 className="text-sm font-bold uppercase tracking-wide text-white">{title}</h2><ul className="mt-4 space-y-3">{links.map(({ label, href }) => <li key={label}>{href ? <a href={href} className="text-sm text-white/82 transition hover:text-white focus-visible:text-white">{label}</a> : <span className="text-sm text-white/56">{label}</span>}</li>)}</ul></div> }
function Social({ children }: { children: React.ReactNode }) { return <span className="grid size-8 place-items-center rounded-full border border-white/25 text-[10px] font-bold text-white/80">{children}</span> }
function UserIcon(props: React.ComponentProps<typeof Target>) { return <Target {...props} /> }
function LayersIcon(props: React.ComponentProps<typeof CalendarDays>) { return <CalendarDays {...props} /> }
function BrainIcon(props: React.ComponentProps<typeof BrainCircuit>) { return <BrainCircuit {...props} /> }
function ReportIcon(props: React.ComponentProps<typeof ShieldCheck>) { return <ShieldCheck {...props} /> }
function TrendIcon(props: React.ComponentProps<typeof Activity>) { return <Activity {...props} /> }
