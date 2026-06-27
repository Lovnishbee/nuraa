import { ChartNoAxesCombined, Crown, Dumbbell, FileText, HeartPulse, Home, Sparkles, UserRound, Utensils } from 'lucide-react'

export const appNavigationItems = [
  { label: 'Home', to: '/app/dashboard', icon: Home },
  { label: 'Check-In', to: '/app/check-in', icon: HeartPulse },
  { label: 'Meals', to: '/app/meals', icon: Utensils },
  { label: 'Workout', to: '/app/workout', icon: Dumbbell },
  { label: 'Coach', to: '/app/coach', icon: Sparkles },
  { label: 'Progress', to: '/app/progress', icon: ChartNoAxesCombined },
  { label: 'Reports', to: '/app/reports', icon: FileText },
  { label: 'Profile', to: '/app/profile', icon: UserRound },
  { label: 'Upgrade', to: '/app/upgrade', icon: Crown, desktopOnly: true },
] as const
