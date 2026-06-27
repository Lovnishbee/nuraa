import { Outlet } from 'react-router-dom'
import { BottomNavigation } from './BottomNavigation'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <div className="min-h-screen bg-canvas md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 pb-24 md:pb-0">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  )
}
