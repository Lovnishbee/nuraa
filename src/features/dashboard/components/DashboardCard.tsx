import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { cn } from '@/lib/utils'
import type { StatefulWidgetProps } from './types'

export function DashboardCard({ title, children, className, status = 'populated', empty, onRetry }: StatefulWidgetProps & { title?: string; children: ReactNode; className?: string; empty?: { title: string; description: string; image?: string } }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} whileHover={{ y: -2 }}>
      <Card className={cn('overflow-hidden p-5 transition-shadow hover:shadow-[0_16px_40px_rgba(22,52,47,.08)]', className)}>
        {title && <h2 className="text-sm font-bold uppercase tracking-[.08em] text-forest">{title}</h2>}
        {status === 'loading' && <LoadingSkeleton className="mt-4 h-44" />}
        {status === 'error' && <ErrorState onRetry={onRetry} />}
        {status === 'empty' && <EmptyState title={empty?.title ?? 'Nothing here yet'} description={empty?.description ?? 'This will fill in as you use Nuraa.'} image={empty?.image} className="mt-4" />}
        {status === 'populated' && children}
      </Card>
    </motion.div>
  )
}
