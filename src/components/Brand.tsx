import { Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) { return <Link to="/" className={cn('inline-flex items-center gap-2 text-forest', className)} aria-label="Nuraa home"><span className="grid size-8 place-items-center rounded-xl bg-nuraa text-white"><Sprout size={18} /></span><span className={cn('font-serif text-2xl tracking-wide', compact && 'text-xl')}>NURAA</span></Link> }
