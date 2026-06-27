import { Moon, Salad, Waves } from 'lucide-react'

export const todaysFocusItems = [
  { icon: Salad, title: 'Start with protein', description: 'Anchor your next meal with a simple whole-food protein.' },
  { icon: Waves, title: 'Hydrate steadily', description: 'Keep water visible and sip consistently through the day.' },
  { icon: Moon, title: 'Protect recovery', description: 'Wind down earlier if sleep felt light or interrupted.' },
] as const

export const dashboardMetrics = {
  calories: { current: 1450, target: 1900, percent: 76 },
  steps: { current: 4650, target: 7000, percent: 66 },
  hydration: { current: '1.6 L', target: '2.5 L', percent: 64 },
  sleep: { duration: '6h 45m' },
  progress: [72, 68, 71, 74, 78, 78, 80],
} as const

export const dashboardEmptyStates = {
  nuraaScore: {
    title: 'Your readiness baseline is starting soon.',
    description: 'Complete your first check-in to begin tracking your daily health signals.',
  },
  meals: {
    title: 'Meal insights unlock when you start logging food.',
    description: 'For now, your nutrition target is based on your profile.',
  },
  movement: {
    title: 'Your movement rhythm is still forming.',
    description: 'Log walks or workouts to help Nuraa understand your activity pattern.',
  },
  hydration: {
    title: 'Hydration tracking is ready.',
    description: 'Use daily check-ins to help Nuraa learn your energy and recovery patterns.',
  },
  sleep: {
    title: 'Sleep signals need a few check-ins.',
    description: 'Log sleep quality daily to build a clearer recovery picture.',
  },
  weeklyReport: {
    title: 'Your first weekly report is on the way.',
    description: 'Complete a few daily check-ins to unlock weekly insights.',
  },
} as const
