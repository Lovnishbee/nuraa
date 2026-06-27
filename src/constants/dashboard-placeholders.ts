import { Moon, Salad, Waves } from 'lucide-react'

export const todaysPriorityPlaceholders = [
  { icon: Salad, title: 'Start with protein', description: 'Anchor your next meal with a simple whole-food protein.' },
  { icon: Waves, title: 'Hydrate steadily', description: 'Keep water visible and aim for small consistent sips.' },
  { icon: Moon, title: 'Protect recovery', description: 'Wind down earlier if sleep felt light or interrupted.' },
] as const

export const dashboardPlaceholderMetrics = {
  calories: { current: 1450, target: 1900, percent: 76 },
  steps: { current: 4650, target: 7000, percent: 66 },
  hydration: { current: '1.6 L', target: '2.5 L', percent: 64 },
  sleep: { duration: '6h 45m' },
  progress: [72, 68, 71, 74, 78, 78, 80],
} as const
