import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={cn('h-12 w-full rounded-2xl border border-forest/12 bg-white/88 px-4 text-sm text-ink outline-none transition placeholder:text-ink/38 focus:border-nuraa focus:bg-white focus:ring-2 focus:ring-nuraa/14', className)} {...props} /> }
