import { Outlet } from 'react-router-dom'
import { BottomNavigation } from './BottomNavigation'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fbfaf7_0%,#f4f7f2_52%,#fbfaf7_100%)] md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 pb-24 md:pb-0">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  )
}
