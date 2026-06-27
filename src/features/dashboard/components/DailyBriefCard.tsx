import { Sparkles } from 'lucide-react'
import morningIllustration from '@/assets/dashboard/morning_illustration.png'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function DailyBriefCard({ status, onRetry }: StatefulWidgetProps) {
  return (
    <DashboardCard status={status} onRetry={onRetry} className="relative min-h-64 bg-forest p-6 text-white" empty={{ title: 'Daily brief pending', description: 'Check in once to unlock your setup brief.' }}>
      <div className="absolute -right-6 -bottom-10 size-44 rounded-full bg-nuraa/50 blur-3xl" />
      <div className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-white/70"><Sparkles size={16} /> Daily brief · setup</div>
      <h2 className="relative mt-4 display text-4xl leading-tight">Your foundation is ready to grow with you.</h2>
      <p className="relative mt-3 max-w-lg text-sm leading-6 text-white/78">Today, focus on one clear signal: complete a check-in. Nuraa will use your mood, energy, sleep, and stress inputs as the starting point for future adaptive guidance.</p>
      <div className="relative mt-5 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/8 p-3">
        <img src={morningIllustration} alt="" className="size-16 rounded-2xl object-cover object-top" />
        <p className="text-sm leading-6 text-white/82">Setup state: no AI brief is generated in Phase 2.</p>
      </div>
    </DashboardCard>
  )
}
