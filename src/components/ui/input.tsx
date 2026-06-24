import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={cn('h-12 w-full rounded-2xl border border-forest/15 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-nuraa focus:ring-2 focus:ring-nuraa/15', className)} {...props} /> }
