import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva('inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nuraa focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', {
  variants: { variant: { primary: 'bg-forest text-white shadow-[0_12px_24px_rgba(22,52,47,.16)] hover:bg-nuraa', secondary: 'border border-forest/10 bg-white text-forest shadow-sm hover:bg-sage', ghost: 'text-forest hover:bg-sage', outline: 'border border-forest/16 bg-white/40 text-forest hover:bg-white' }, size: { default: '', sm: 'min-h-9 rounded-xl px-3 text-xs', lg: 'min-h-13 px-7 text-base' } },
  defaultVariants: { variant: 'primary', size: 'default' },
})
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) { const Component = asChild ? Slot : 'button'; return <Component className={cn(buttonVariants({ variant, size, className }))} {...props} /> }
