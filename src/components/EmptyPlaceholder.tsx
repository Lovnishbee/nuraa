import type { LucideIcon } from 'lucide-react'
import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
export function EmptyPlaceholder({ title, description, icon: Icon = Sparkles }: { title: string; description: string; icon?: LucideIcon }) { return <Card className="p-5"><div className="mb-5 grid size-10 place-items-center rounded-2xl bg-sage text-nuraa"><Icon size={20} /></div><p className="font-semibold text-forest">{title}</p><p className="mt-1 text-sm leading-5 text-ink/60">{description}</p><span className="mt-4 inline-block rounded-full bg-sand/50 px-2.5 py-1 text-[11px] font-semibold text-forest/65">Setup placeholder</span></Card> }
