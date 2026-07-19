import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('rounded-[26px] border border-forest/10 bg-white/92 shadow-[0_12px_36px_rgba(22,52,47,.055)] backdrop-blur-sm', className)} {...props} /> }
