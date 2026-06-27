import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Tabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: { label: string; value: T; content: ReactNode }[]; onChange: (value: T) => void }) {
  const active = tabs.find((tab) => tab.value === value)

  return (
    <div>
      <div role="tablist" className="inline-flex rounded-2xl bg-sage p-1">
        {tabs.map((tab) => (
          <button key={tab.value} type="button" role="tab" aria-selected={tab.value === value} onClick={() => onChange(tab.value)} className={cn('rounded-xl px-4 py-2 text-sm font-semibold transition', tab.value === value ? 'bg-white text-nuraa shadow-sm' : 'text-forest/60 hover:text-forest')}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-5">{active?.content}</div>
    </div>
  )
}
