import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { cn } from '@/lib/utils'
import type { StatefulWidgetProps } from './types'

export function DashboardCard({ title, children, className, status = 'populated', empty, emptyAction, onRetry }: StatefulWidgetProps & { title?: string; children: ReactNode; className?: string; empty?: { title: string; description: string; image?: string }; emptyAction?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Card className={cn('overflow-hidden p-5 transition-shadow hover:shadow-[0_18px_44px_rgba(22,52,47,.075)]', className)}>
        {title && <h2 className="text-xs font-bold uppercase tracking-[.12em] text-forest/70">{title}</h2>}
        {status === 'loading' && <LoadingSkeleton className="mt-4 h-44" />}
        {status === 'error' && <ErrorState onRetry={onRetry} />}
        {status === 'empty' && (
          <div>
            <EmptyState title={empty?.title ?? 'Nothing here yet'} description={empty?.description ?? 'This will fill in as you use Nuraa.'} image={empty?.image} className="mt-4" />
            {emptyAction && <div className="mt-4">{emptyAction}</div>}
          </div>
        )}
        {status === 'populated' && children}
      </Card>
    </motion.div>
  )
}
