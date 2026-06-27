import { useState } from 'react'
import { Activity, CalendarDays, HeartPulse, Smile } from 'lucide-react'
import { NotificationBell } from '@/components/app/NotificationBell'
import { ProfileAvatar } from '@/components/app/ProfileAvatar'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/Drawer'
import { Dropdown } from '@/components/ui/Dropdown'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { designTokens } from '@/constants/design-tokens'
import hydrationIllustration from '@/assets/dashboard/hydration_illustration.png'
import { DailyBriefCard } from '@/features/dashboard/components/DailyBriefCard'
import { DashboardCard } from '@/features/dashboard/components/DashboardCard'
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout'
import { HydrationCard } from '@/features/dashboard/components/HydrationCard'
import { InsightCard } from '@/features/dashboard/components/InsightCard'
import { MealCard } from '@/features/dashboard/components/MealCard'
import { MetricTile } from '@/features/dashboard/components/MetricTile'
import { NuraaScoreCard } from '@/features/dashboard/components/NuraaScoreCard'
import { ProgressCard } from '@/features/dashboard/components/ProgressCard'
import { SectionHeader } from '@/features/dashboard/components/SectionHeader'
import { SleepCard } from '@/features/dashboard/components/SleepCard'
import { TodaysPrioritiesCard } from '@/features/dashboard/components/TodaysPrioritiesCard'
import { WeeklyReportCard } from '@/features/dashboard/components/WeeklyReportCard'
import { WorkoutCard } from '@/features/dashboard/components/WorkoutCard'
import { PermissionConnectionCard, ProfileHeroCard } from '@/features/profile/ProfilePage'
import type { Profile } from '@/types/database'

export function ComponentPlaygroundPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [tab, setTab] = useState<'cards' | 'states'>('cards')
  const [dropdown, setDropdown] = useState('Today')

  return (
    <DashboardLayout>
      <SectionHeader title="Component playground" eyebrow="Internal design system" action={<Button onClick={() => setModalOpen(true)}>Open modal</Button>} />
      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/62">Reusable components, states, tokens, and dashboard widgets for keeping Nuraa visually consistent.</p>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-forest">Design tokens</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {Object.entries(designTokens.colors).slice(0, 6).map(([name, value]) => (
            <div key={name} className="rounded-3xl border border-forest/10 bg-white p-4">
              <div className="h-16 rounded-2xl" style={{ background: value }} />
              <p className="mt-3 text-sm font-bold text-forest">{name}</p>
              <p className="text-xs text-ink/50">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <DashboardCard title="Controls">
            <div className="mt-4 space-y-4">
              <Button onClick={() => setDrawerOpen(true)} className="w-full">Open drawer</Button>
              <Button variant="outline" className="w-full">Secondary action</Button>
              <Dropdown label="Range" value={dropdown} options={['Today', 'This week', 'This month']} onChange={setDropdown} />
              <div className="flex items-center gap-3"><NotificationBell hasUnread /><ProfileAvatar name="Ananya Rao" /></div>
            </div>
          </DashboardCard>
          <MetricTile icon={Activity} label="Metric tile" value="78%" detail="Reusable metric" />
        </div>

        <div>
          <Tabs value={tab} onChange={setTab} tabs={[
            { label: 'Widgets', value: 'cards', content: <WidgetGrid /> },
            { label: 'States', value: 'states', content: <StateGrid /> },
          ]} />
        </div>
      </section>

      <Drawer open={drawerOpen} title="Drawer component" onClose={() => setDrawerOpen(false)}>
        <p className="text-sm leading-6 text-ink/65">Used for focused details, filters, and future editable settings.</p>
      </Drawer>
      <Modal open={modalOpen} title="Modal component" onClose={() => setModalOpen(false)}>
        <p className="text-sm leading-6 text-ink/65">Used for confirmations and focused one-off interactions.</p>
      </Modal>
    </DashboardLayout>
  )
}

function WidgetGrid() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <NuraaScoreCard score={78} category="High readiness" reason="You slept well, and your setup signals look steady." />
      <DailyBriefCard />
      <TodaysPrioritiesCard />
      <MealCard />
      <WorkoutCard />
      <HydrationCard />
      <SleepCard quality={4} />
      <ProgressCard />
      <WeeklyReportCard checkins={4} />
      <InsightCard icon={HeartPulse} title="Insight card" description="Reusable surface for future guidance." />
      <ProfileExamples />
      <CheckInControlExample />
    </div>
  )
}

function StateGrid() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <DashboardCard title="Loading state"><LoadingSkeleton className="mt-4 h-32" /></DashboardCard>
      <DashboardCard title="Empty wrapper" status="empty" empty={{ title: 'Empty state', description: 'Reusable empty state with illustration.', image: hydrationIllustration }}>Unused</DashboardCard>
      <DashboardCard title="Error wrapper" status="error">Unused</DashboardCard>
      <NuraaScoreCard status="empty" />
      <DailyBriefCard status="loading" />
      <TodaysPrioritiesCard status="error" />
      <EmptyState title="Standalone empty" description="A standalone reusable empty state." image={hydrationIllustration} />
      <ErrorState title="Standalone error" description="A standalone reusable error state." />
      <SuccessModalExample />
    </div>
  )
}

const demoProfile: Profile = {
  id: 'profile-demo',
  full_name: 'Ananya Rao',
  email: 'ananya@nuraa.health',
  phone: null,
  avatar_url: null,
  date_of_birth: null,
  age: 31,
  gender: 'female',
  location_city: 'Mumbai',
  location_country: 'India',
  timezone: 'Asia/Kolkata',
  onboarding_completed: true,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
}

function ProfileExamples() {
  return (
    <div className="lg:col-span-2">
      <ProfileHeroCard profile={demoProfile} email={demoProfile.email} activeGoals={3} />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <PermissionConnectionCard title="Calendar" description="Helps Nuraa understand your schedule" enabled={false} icon={CalendarDays} />
        <PermissionConnectionCard title="Camera" description="Used later for food photo logging" enabled icon={HeartPulse} />
      </div>
    </div>
  )
}

function CheckInControlExample() {
  return (
    <DashboardCard title="Check-in controls">
      <div className="mt-4 rounded-3xl border border-forest/10 bg-canvas p-4">
        <legend className="flex items-center gap-2 text-sm font-bold text-forest"><Smile size={17} className="text-nuraa" /> Mood</legend>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {['Very low', 'Low', 'Okay', 'Good', 'Great'].map((label, index) => (
            <button key={label} type="button" aria-pressed={index === 3} className={`rounded-2xl border p-3 text-center text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nuraa/25 ${index === 3 ? 'border-nuraa bg-sage text-forest' : 'border-forest/10 bg-white text-forest/65'}`}>{label}</button>
          ))}
        </div>
      </div>
    </DashboardCard>
  )
}

function SuccessModalExample() {
  return (
    <DashboardCard title="Success modal">
      <div className="mt-4 rounded-3xl border border-forest/10 bg-white p-5 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-sage text-nuraa"><Smile size={22} /></div>
        <p className="mt-4 font-semibold text-forest">Check-in saved</p>
        <p className="mt-1 text-sm leading-6 text-ink/60">Your health signal has been captured. Nuraa is updating your dashboard.</p>
      </div>
    </DashboardCard>
  )
}
