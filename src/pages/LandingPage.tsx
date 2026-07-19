import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Activity, BrainCircuit, CalendarDays, Check, ChevronRight, CirclePlay, HeartPulse, Leaf, Menu, ShieldCheck, Sparkles, Target, X } from 'lucide-react'
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
  { icon: HeartPulse, title: 'Daily check-ins', copy: 'Capture how your body feels.' },
  { icon: Activity, title: 'Signal trends', copy: 'See readiness, energy, sleep, and recovery.' },
  { icon: ShieldCheck, title: 'Private foundation', copy: 'Keep your health context under your control.' },
  { icon: Sparkles, title: 'Nuraa', copy: 'Turns simple signals into one useful next step.', accent: true },
]

const features: { id?: string; icon: LucideIcon; title: string; copy: string }[] = [
  { icon: Sparkles, title: 'Nuraa Score', copy: 'A daily readiness score from 0-100 built from your saved check-ins.' },
  { icon: HeartPulse, title: 'Daily Check-in', copy: 'Log mood, sleep, energy, stress, soreness, and reflection in about a minute.' },
  { icon: Activity, title: 'Progress Trends', copy: 'Follow the signals that matter without turning the app into a spreadsheet.' },
  { id: 'health-reports', icon: CalendarDays, title: 'Weekly Reports', copy: 'Review patterns, score factors, and one practical focus for the week.' },
  { id: 'ai-coach', icon: BrainCircuit, title: 'Private-beta Coach', copy: 'Ask contextual wellness questions when Coach is enabled for your account.' },
  { icon: ShieldCheck, title: 'Privacy Controls', copy: 'See profile, permissions, and Coach controls in one clear place.' },
]

const footerLinkGroups: { title: string; links: NavigationItem[] }[] = [
  { title: 'Product', links: [navItems[1], navItems[2], navItems[3], { label: 'Reports', href: '#health-reports' }, navItems[4]] },
  { title: 'Company', links: [{ label: 'About Us', href: '#footer' }, { label: 'Science', href: null }, { label: 'Blog', href: null }, { label: 'Contact', href: null }] },
  { title: 'Support', links: [{ label: 'Help Center', href: null }, { label: 'Privacy Policy', href: null }, { label: 'Terms of Use', href: null }, { label: 'Security', href: null }] },
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
          <p className="mt-6 max-w-[525px] text-base leading-7 text-ink/85 lg:text-lg lg:leading-8">Nuraa turns a one-minute daily check-in into a clearer readiness score, calmer trend view, and one practical focus for today.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="w-full sm:w-auto"><Link to="/register">Get My Nuraa Score</Link></Button><Button asChild variant="outline" size="lg" className="w-full sm:w-auto"><a href="#how-it-works">Watch Demo <CirclePlay size={18} /></a></Button></div>
          <div className="mt-10 grid max-w-[610px] grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">{[['One minute', 'Daily', 'Check in quickly'], ['Privacy', 'First', 'Your data stays yours'], ['Signals', 'Clear', 'Sleep, stress, recovery'], ['Web app', '', 'Built for daily use']].map(([title, strong, copy]) => <div key={title} className="flex gap-2"><Check className="mt-0.5 shrink-0 text-nuraa" size={17} strokeWidth={2.4} /><div><p className="text-sm font-bold text-forest">{title}</p>{strong && <p className="text-[13px] font-semibold text-forest/85">{strong}</p>}<p className="text-[13px] leading-5 text-ink/70">{copy}</p></div></div>)}</div>
        </div>
        <HeroScorePreview />
      </section>

      <section className="mx-auto max-w-[1340px] px-5 py-16 sm:px-8 lg:px-12 lg:py-22">
        <SectionLabel>THE PROBLEM</SectionLabel>
        <h2 className="display mx-auto mt-4 max-w-2xl text-center text-[42px] leading-tight text-forest sm:text-5xl">A calmer way to notice what your body is telling you.</h2>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">{problemCards.map(({ icon: Icon, title, copy, accent }) => <Card key={title} className={cn('relative min-h-50 overflow-hidden p-6 text-center', accent ? 'border-nuraa bg-forest shadow-[0_20px_42px_rgba(14,118,110,.32)] lg:-translate-y-3' : 'glass-surface')}>
          {accent && <><span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#9bd4c4] to-transparent" /><span className="relative inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-bold tracking-[.12em] text-[#bde9db]">THE NURAA DIFFERENCE</span></>}
          <div className={cn('relative mx-auto grid size-12 place-items-center rounded-2xl', accent ? 'mt-3 bg-white text-nuraa shadow-lg' : 'bg-sage text-nuraa')}><Icon size={25} strokeWidth={1.8} /></div><h3 className={cn('relative mt-5 text-base font-bold', accent ? 'text-white' : 'text-forest')}>{title}</h3><p className={cn('relative mx-auto mt-2 max-w-44 text-sm leading-6', accent ? 'text-white/88' : 'text-ink/75')}>{copy}</p>{accent && <span className="relative mt-4 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[.12em] text-[#d7f4e9]">One clear direction <ChevronRight size={14} /></span>}</Card>)}</div>
      </section>

      <section id="how-it-works" className="glass-band my-5 border-y border-forest/8 px-5 py-16 sm:px-8 lg:my-8 lg:px-12 lg:py-22">
        <SectionLabel>HOW NURAA WORKS</SectionLabel>
        <h2 className="display mx-auto mt-4 max-w-3xl text-center text-[42px] text-forest sm:text-5xl">Small daily inputs. Useful daily clarity.</h2>
        <div className="mx-auto mt-12 max-w-6xl"><div className="hidden h-px bg-nuraa/30 md:block" /><div className="grid gap-8 md:-mt-4 md:grid-cols-5">{[[UserIcon, '1. Set your foundation', 'Save the health context and goals that should shape your app.'], [LayersIcon, '2. Check in daily', 'Log mood, energy, sleep, stress, soreness, and a short reflection.'], [BrainIcon, '3. Get your score', 'Nuraa calculates a daily readiness score from deterministic signals.'], [ReportIcon, '4. Review what changed', 'Reports surface patterns, score factors, and timely recommendations.'], [TrendIcon, '5. Keep one focus', 'Use progress trends to stay consistent without overthinking it.']].map(([Icon, title, copy]) => { const StepIcon = Icon as typeof UserIcon; return <article key={title as string} className="relative text-center"><span className="mx-auto grid size-14 place-items-center rounded-full border border-nuraa/20 bg-sage text-nuraa"><StepIcon size={23} /></span><h3 className="mt-5 text-sm font-bold text-forest">{title as string}</h3><p className="mx-auto mt-2 max-w-44 text-sm leading-6 text-ink/72">{copy as string}</p></article>})}</div></div>
      </section>

      <section id="features" className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-12 lg:py-22">
        <SectionLabel>POWERFUL FEATURES</SectionLabel>
        <h2 className="display mt-4 text-center text-[42px] text-forest sm:text-5xl">Every screen has a daily job.</h2>
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

function HeroScorePreview() { return <div className="relative mx-auto w-full max-w-[700px]"><Card className="glass-surface relative mx-auto max-w-[590px] p-5 sm:p-7"><p className="relative text-xs font-bold tracking-wide text-forest">NURAA SCORE</p><div className="relative mt-5 grid items-center gap-5 sm:grid-cols-[235px_1fr]"><ScoreRing score={78} className="mx-auto w-48 sm:w-52" /><div><p className="max-w-44 text-lg font-semibold leading-7 text-forest">You slept well, but stress is trending high.</p><p className="mt-6 text-xs font-bold text-forest">Today’s Focus</p><ul className="mt-3 space-y-2.5 text-sm text-ink/78"><Focus>Protect a recovery window</Focus><Focus>Hydrate before lunch</Focus><Focus>Keep training light</Focus></ul></div></div><div className="relative mt-6 rounded-2xl bg-forest p-5 text-white"><div className="flex items-center justify-between"><p className="text-xs font-bold tracking-wide">TODAY’S BRIEF</p><ChevronRight size={16} /></div><p className="mt-3 max-w-[420px] text-base leading-7 text-white/92">Your readiness looks steady. Keep the day simple: support recovery, reduce friction, and check in again tomorrow.</p><p className="mt-4 flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} /> Focus: Recovery & consistency</p></div></Card><PhonePreview /></div> }
function PhonePreview() { return <img src={heroPhone} alt="Nuraa Score on a mobile phone" className="absolute -right-8 -top-22 hidden w-57 drop-shadow-2xl xl:block" /> }
function PricingSection() { return <section id="pricing" className="glass-band my-5 border-y border-forest/8 px-5 py-16 sm:px-8 lg:my-8 lg:px-12 lg:py-22"><SectionLabel>MEMBERSHIP</SectionLabel><h2 className="display mx-auto mt-4 max-w-3xl text-center text-[42px] leading-tight text-forest sm:text-5xl">Start with the daily loop.</h2><p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-ink/78 lg:text-lg">Nuraa begins with the product you can use every day: check-ins, readiness, reports, profile, and progress.</p><div className="mx-auto mt-11 grid max-w-4xl gap-5 md:grid-cols-2"><Card className="glass-surface p-7 sm:p-8"><p className="text-xs font-bold tracking-[.12em] text-nuraa">AVAILABLE NOW</p><h3 className="display mt-4 text-4xl text-forest">Nuraa Free</h3><p className="mt-2 text-lg font-bold text-forest">Free forever</p><p className="mt-5 max-w-sm text-base leading-7 text-ink/78">Build your foundation, complete check-ins, and review your readiness patterns.</p><ul className="mt-7 space-y-3 text-sm leading-6 text-ink/82"><PlanFeature>Personal profile and health foundation</PlanFeature><PlanFeature>Daily check-in and readiness baseline</PlanFeature><PlanFeature>Progress trends and reports</PlanFeature><PlanFeature>Private profile and permission controls</PlanFeature></ul><Button asChild size="lg" className="mt-8 w-full"><Link to="/register">Get started free</Link></Button></Card><Card className="relative overflow-hidden border border-nuraa bg-forest p-7 text-white shadow-[0_24px_54px_rgba(14,118,110,.32)] sm:p-8"><span className="relative inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold tracking-[.12em] text-[#d7f4e9]">PRIVATE BETA</span><h3 className="display relative mt-4 text-4xl">Nuraa Coach</h3><p className="relative mt-2 text-lg font-bold text-white">Contextual wellness guidance.</p><p className="relative mt-5 max-w-sm text-base leading-7 text-white/86">Coach is enabled only for approved beta accounts and stays grounded in your Nuraa context.</p><ul className="relative mt-7 space-y-3 text-sm leading-6 text-white/88"><PlanFeature inverse>Ask about today’s score and brief</PlanFeature><PlanFeature inverse>Start from proactive guidance cards</PlanFeature><PlanFeature inverse>Control response detail from Profile</PlanFeature><PlanFeature inverse>Clear limits: no diagnosis or prescriptions</PlanFeature></ul><Button asChild variant="secondary" size="lg" className="relative mt-8 w-full border-white/30 bg-white text-forest hover:bg-sage"><Link to="/register">Start with Nuraa Free</Link></Button><p className="relative mt-4 text-center text-sm text-white/72">No payment details or checkout required.</p></Card></div></section> }
function PlanFeature({ children, inverse = false }: { children: React.ReactNode; inverse?: boolean }) { return <li className="flex items-start gap-3"><Check className={cn('mt-1 shrink-0', inverse ? 'text-[#a6e4d1]' : 'text-nuraa')} size={16} strokeWidth={3} /><span>{children}</span></li> }
function ResultsSection() { return <section className="mx-auto max-w-[1400px] px-5 py-4 sm:px-8 lg:px-12"><div className="relative overflow-hidden rounded-[34px] bg-forest px-7 py-10 text-white sm:px-10 lg:grid lg:min-h-89 lg:grid-cols-[.74fr_1.26fr] lg:items-center lg:px-16"><div className="relative hidden lg:block"><img src={heroPhone} alt="Nuraa Score mobile app" className="mx-auto -my-13 w-60 rotate-[-12deg] drop-shadow-2xl" /></div><div className="relative"><h2 className="display max-w-xl text-[42px] leading-tight sm:text-5xl">Designed for repeat use, not feature clutter.</h2><div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">{[['1 min', 'A focused check-in instead of a long tracker'], ['0-100', 'A readiness score you can scan quickly'], ['7/30d', 'Trend ranges for short and medium patterns'], ['Private', 'Profile and permissions stay visible']].map(([value, copy]) => <div key={value}><p className="font-serif text-4xl text-white">{value}</p><p className="mt-2 text-sm leading-5 text-white/80">{copy}</p></div>)}</div><p className="mt-8 text-base text-white/90">Start with one check-in. Let the rest of the app earn its place.</p></div></div></section> }
function Footer() { return <footer id="footer" className="bg-[#063b35] px-5 py-12 text-white sm:px-8 lg:px-12"><div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1.25fr]"><div><Brand className="text-white [&_span:last-child]:text-white" /><p className="mt-5 max-w-55 text-base leading-7 text-white/82">A private readiness app for daily check-ins, trends, and practical wellness guidance.</p><div className="mt-6 flex gap-2"><Social>ig</Social><Social>in</Social><Social>𝕏</Social></div></div>{footerLinkGroups.map(({ title, links }) => <FooterLinks key={title} title={title} links={links} />)}<div className="rounded-2xl border border-white/15 p-5"><p className="text-base font-semibold">Use Nuraa on web</p><p className="mt-1 text-sm leading-6 text-white/75">Create your account and start with a private health foundation.</p><Button asChild variant="secondary" size="sm" className="mt-5 bg-white text-forest hover:bg-sage"><Link to="/register">Get started</Link></Button></div></div><div className="mx-auto mt-10 flex max-w-[1400px] flex-col justify-between gap-2 border-t border-white/10 pt-6 text-sm text-white/70 sm:flex-row"><span>© 2026 Nuraa. All rights reserved.</span><span>Private wellness guidance for everyday use.</span></div></footer> }
function SectionLabel({ children }: { children: React.ReactNode }) { return <p className="glass-chip mx-auto w-fit rounded-full px-3 py-1 text-[11px] font-bold tracking-[.04em] text-nuraa">{children}</p> }
function Focus({ children }: { children: React.ReactNode }) { return <li className="flex items-center gap-2"><Check className="text-nuraa" size={15} strokeWidth={3} />{children}</li> }
function FooterLinks({ title, links }: { title: string; links: NavigationItem[] }) { return <div><h2 className="text-sm font-bold uppercase tracking-wide text-white">{title}</h2><ul className="mt-4 space-y-3">{links.map(({ label, href }) => <li key={label}>{href ? <a href={href} className="text-sm text-white/82 transition hover:text-white focus-visible:text-white">{label}</a> : <span className="text-sm text-white/56">{label}</span>}</li>)}</ul></div> }
function Social({ children }: { children: React.ReactNode }) { return <span className="grid size-8 place-items-center rounded-full border border-white/25 text-[10px] font-bold text-white/80">{children}</span> }
function UserIcon(props: React.ComponentProps<typeof Target>) { return <Target {...props} /> }
function LayersIcon(props: React.ComponentProps<typeof CalendarDays>) { return <CalendarDays {...props} /> }
function BrainIcon(props: React.ComponentProps<typeof BrainCircuit>) { return <BrainCircuit {...props} /> }
function ReportIcon(props: React.ComponentProps<typeof ShieldCheck>) { return <ShieldCheck {...props} /> }
function TrendIcon(props: React.ComponentProps<typeof Activity>) { return <Activity {...props} /> }
