import type { ReactNode } from 'react'

export function SectionHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">{eyebrow}</p>}
        <h2 className="display mt-1 text-3xl leading-none text-forest">{title}</h2>
      </div>
      {action}
    </div>
  )
}
