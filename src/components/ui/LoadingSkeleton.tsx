import { cn } from '@/lib/utils'

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-forest/8', className)} />
}
