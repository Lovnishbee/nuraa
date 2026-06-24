import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('rounded-3xl border border-forest/10 bg-white shadow-[0_8px_30px_rgba(22,52,47,.05)]', className)} {...props} /> }
