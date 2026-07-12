import { CalendarDays, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/ui/IconBadge'
import { dashboardEmptyStates } from '@/constants/dashboard-content'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function WeeklyReportCard({ checkins = 0, status, onRetry }: StatefulWidgetProps & { checkins?: number }) {
  return (
    <DashboardCard title="Weekly report" status={status} onRetry={onRetry} empty={dashboardEmptyStates.weeklyReport}>
      <div className="mt-5 flex items-start gap-4">
        <IconBadge icon={FileText} tone="sand" />
        <div>
          <p className="text-xl font-bold text-forest">Foundation week</p>
          <p className="mt-1 text-sm leading-6 text-ink/62">{checkins} check-in{checkins === 1 ? '' : 's'} recorded this week. Weekly insights unlock as your signal history grows.</p>
        </div>
      </div>
      <div className="mt-5 rounded-2xl bg-canvas p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-forest"><CalendarDays size={16} strokeWidth={1.9} /> Ready after a few check-ins</p>
        <p className="mt-1 text-xs leading-5 text-ink/58">Available once your weekly data history is richer.</p>
      </div>
      <Button asChild variant="outline" size="sm" className="mt-5"><Link to="/app/weekly-reflection">View weekly reflection</Link></Button>
    </DashboardCard>
  )
}
