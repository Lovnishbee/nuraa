import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import morningIllustration from '@/assets/dashboard/morning_illustration.png'
import { Button } from '@/components/ui/button'
import type { DailyBriefRow } from '@/types/database'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

type FocusItem = { title: string; description: string; category?: string }

function parseFocusItems(value: unknown): FocusItem[] {
  return Array.isArray(value)
    ? value.filter((item): item is FocusItem => Boolean(item && typeof item === 'object' && 'title' in item && 'description' in item))
    : []
}

export function DailyBriefCard({ brief, coachActionHref, status, onRetry }: StatefulWidgetProps & { brief?: DailyBriefRow | null; coachActionHref?: string }) {
  const focusItems = parseFocusItems(brief?.focus_items)
  const hasBrief = Boolean(brief)
  return (
    <DashboardCard status={status} onRetry={onRetry} className="relative min-h-[320px] bg-forest p-7 text-white shadow-[0_24px_58px_rgba(22,52,47,.18)]" empty={{ title: 'Your daily brief is warming up.', description: 'Complete a check-in so Nuraa can begin shaping your first daily view.' }}>
      <div className="absolute -right-10 -bottom-14 size-56 rounded-full bg-nuraa/55 blur-3xl" />
      <div className="absolute left-8 top-0 h-px w-36 bg-gradient-to-r from-white/65 to-transparent" />
      <div className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-white/72"><Sparkles size={16} strokeWidth={1.9} /> Daily brief</div>
      <h2 className="relative mt-4 display max-w-2xl text-[42px] leading-[1.02] sm:text-5xl">{brief?.headline ?? 'Your foundation is ready to grow with you.'}</h2>
      <p className="relative mt-4 max-w-2xl text-base leading-7 text-white/84">{brief?.summary ?? 'Complete your daily check-in so Nuraa can start learning your energy, sleep, stress, and recovery patterns.'}</p>
      <div className="relative mt-6 flex flex-col gap-3 rounded-[22px] border border-white/15 bg-white/8 p-4 sm:flex-row sm:items-center">
        <img src={morningIllustration} alt="" className="size-16 rounded-2xl object-cover object-top" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{hasBrief ? (brief?.insight ?? 'Your daily signal has been processed.') : 'Your first few check-ins help build your readiness baseline.'}</p>
          <p className="mt-1 text-sm leading-6 text-white/72">{focusItems[0]?.description ?? 'Personalised rule-based briefs become richer as more signals are collected.'}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Button asChild variant="secondary" size="sm" className="bg-white text-forest hover:bg-sage">
            <Link to={hasBrief ? '/app/reports' : '/app/check-in'}>{hasBrief ? 'View insights' : 'Start check-in'}</Link>
          </Button>
          {coachActionHref && hasBrief && (
            <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
              <Link to={coachActionHref}>Ask about today</Link>
            </Button>
          )}
        </div>
      </div>
    </DashboardCard>
  )
}
