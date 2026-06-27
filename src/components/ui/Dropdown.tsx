import { ChevronDown } from 'lucide-react'

export function Dropdown({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-forest">{label}</span>
      <span className="relative block">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full appearance-none rounded-2xl border border-forest/15 bg-white px-4 pr-10 text-sm font-semibold text-forest outline-none transition focus:border-nuraa focus:ring-2 focus:ring-nuraa/15">
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-forest/45" size={17} />
      </span>
    </label>
  )
}
