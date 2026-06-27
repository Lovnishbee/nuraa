import type { ReactNode } from 'react'

export function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1440px] px-5 py-5 sm:px-7 lg:px-10 lg:py-8">{children}</div>
}

export function DashboardGrid({ children }: { children: ReactNode }) {
  return <div className="mt-6 grid gap-5 lg:grid-cols-12 lg:items-start">{children}</div>
}
