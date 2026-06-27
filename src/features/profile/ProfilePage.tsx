import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Camera, HeartPulse, Leaf, LogOut, MapPin, Mic, Pencil, ShieldCheck, Target, Utensils, Workflow } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/IconBadge'
import { logout } from '@/services/auth'
import { getProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'
import type { HealthProfile, Profile, UserGoal, UserPermissions, UserPreferences } from '@/types/database'
import { cn } from '@/lib/utils'

function initials(name?: string | null, email?: string | null) {
  const source = name || email || 'Nuraa Member'
  return source.split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'NM'
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Recently joined'
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(value))
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-canvas/80 p-4">
      <dt className="text-xs font-bold uppercase tracking-[.1em] text-ink/45">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-6 text-forest">{value}</dd>
    </div>
  )
}

export function ProfileHeroCard({ profile, email, activeGoals }: { profile: Profile; email?: string | null; activeGoals: number }) {
  const location = [profile.location_city, profile.location_country].filter(Boolean).join(', ') || profile.timezone

  return (
    <Card className="mt-8 overflow-hidden p-6 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-[24px] bg-forest text-xl font-bold text-white shadow-[0_18px_36px_rgba(22,52,47,.18)]">{initials(profile.full_name, email)}</div>
          <div>
            <h2 className="text-2xl font-bold text-forest">{profile.full_name || 'Nuraa member'}</h2>
            <p className="mt-1 text-sm text-ink/62">{profile.email || email}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink/58"><MapPin size={15} strokeWidth={1.9} /> {location}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
          <ProfileStat label="Active goals" value={`${activeGoals}`} />
          <ProfileStat label="Readiness" value={profile.onboarding_completed ? 'Baseline started' : 'Building'} />
          <ProfileStat label="Member since" value={formatDate(profile.created_at)} />
        </div>
      </div>
    </Card>
  )
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-forest/8 bg-sage/60 p-4">
      <p className="text-xs font-bold uppercase tracking-[.1em] text-ink/45">{label}</p>
      <p className="mt-1 text-sm font-bold text-forest">{value}</p>
    </div>
  )
}

function ProfileSection({ title, description, icon, children }: { title: string; description: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <IconBadge icon={icon} />
        <div>
          <h2 className="font-bold text-forest">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-ink/58">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  )
}

function GoalPills({ goals }: { goals: UserGoal[] }) {
  if (!goals.length) return <p className="rounded-2xl bg-canvas p-4 text-sm text-ink/62">No goals saved yet. Add goals during onboarding to shape your health foundation.</p>

  return (
    <div className="flex flex-wrap gap-2">
      {goals.map((goal) => <span key={goal.id} className="rounded-full bg-sage px-3 py-1.5 text-sm font-semibold text-forest">{goal.goal_label}</span>)}
    </div>
  )
}

export function PermissionConnectionCard({ title, description, enabled, icon }: { title: string; description: string; enabled: boolean; icon: LucideIcon }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-forest/8 bg-canvas/70 p-4">
      <div className="flex gap-3">
        <IconBadge icon={icon} />
        <div>
          <p className="font-semibold text-forest">{title}</p>
          <p className="mt-1 text-sm leading-5 text-ink/58">{description}</p>
        </div>
      </div>
      <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', enabled ? 'bg-sage text-nuraa' : 'bg-white text-ink/55')}>{enabled ? 'Enabled' : 'Not enabled'}</span>
    </div>
  )
}

function PermissionsGrid({ permissions }: { permissions: UserPermissions | null }) {
  const items = [
    { title: 'Calendar', description: 'Helps Nuraa understand your schedule', enabled: Boolean(permissions?.calendar_connected), icon: CalendarDays },
    { title: 'Location', description: 'Supports future context for travel and environment', enabled: Boolean(permissions?.location_enabled), icon: MapPin },
    { title: 'Notifications', description: 'Used later for gentle health reminders', enabled: Boolean(permissions?.notifications_enabled), icon: ShieldCheck },
    { title: 'Camera', description: 'Used later for food photo logging', enabled: Boolean(permissions?.camera_enabled), icon: Camera },
    { title: 'Microphone', description: 'Used later for voice-based logging', enabled: Boolean(permissions?.microphone_enabled), icon: Mic },
  ]

  return <div className="grid gap-3">{items.map((item) => <PermissionConnectionCard key={item.title} {...item} />)}</div>
}

function HealthDetails({ healthProfile }: { healthProfile: HealthProfile | null }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <Field label="Height" value={healthProfile?.height_cm ? `${healthProfile.height_cm} cm` : 'Not set'} />
      <Field label="Weight" value={healthProfile?.weight_kg ? `${healthProfile.weight_kg} kg` : 'Not set'} />
      <Field label="Medical conditions" value={healthProfile?.medical_conditions?.length ? healthProfile.medical_conditions.join(', ') : 'None shared'} />
      <Field label="Allergies" value={healthProfile?.allergies?.length ? healthProfile.allergies.join(', ') : 'None shared'} />
    </dl>
  )
}

function LifestyleDetails({ preferences }: { preferences: UserPreferences | null }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <Field label="Work style" value={preferences?.work_type || 'Not set'} />
      <Field label="Work schedule" value={preferences?.work_schedule || 'Not set'} />
      <Field label="Travel rhythm" value={preferences?.travel_frequency || 'Not set'} />
      <Field label="Commute" value={preferences?.commute_minutes !== null && preferences?.commute_minutes !== undefined ? `${preferences.commute_minutes} minutes` : 'Not set'} />
    </dl>
  )
}

function NutritionDetails({ preferences }: { preferences: UserPreferences | null }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <Field label="Diet" value={preferences?.diet_preference || 'Not set'} />
      <Field label="Cuisine preference" value={preferences?.cuisine_preferences?.join(', ') || 'Not set'} />
      <Field label="Disliked foods" value={preferences?.disliked_foods?.join(', ') || 'None shared'} />
      <Field label="Restrictions" value="Based on your saved medical and allergy profile" />
    </dl>
  )
}

export function ProfilePage() {
  const user = useAuthStore((state) => state.user)!
  const navigate = useNavigate()
  const bundle = useQuery({ queryKey: ['profile', user.id], queryFn: () => getProfileBundle(user.id) })

  if (bundle.isLoading) return <div className="p-10 text-sm text-forest/60">Loading your health profile…</div>
  if (bundle.error || !bundle.data) return <div className="p-10 text-sm text-red-700">Unable to load your health profile.</div>

  const { profile, healthProfile, goals, preferences, permissions } = bundle.data
  const activeGoals = goals.filter((goal) => goal.status === 'active').length

  async function signOut() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="mx-auto max-w-[1180px] p-5 sm:p-7 lg:p-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Your foundation</p>
          <h1 className="display mt-2 text-4xl text-forest sm:text-5xl">Health Profile</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/62">Your saved health details, goals, lifestyle, and preferences in one place.</p>
        </div>
        <Button variant="outline" size="sm" disabled><Pencil size={15} /> Editing soon</Button>
      </header>

      <ProfileHeroCard profile={profile} email={user.email} activeGoals={activeGoals} />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ProfileSection title="Health profile" description="The basics Nuraa uses to understand your body context." icon={HeartPulse}>
          <HealthDetails healthProfile={healthProfile} />
        </ProfileSection>

        <ProfileSection title="Goals" description="Your active direction for daily guidance." icon={Target}>
          <GoalPills goals={goals} />
        </ProfileSection>

        <ProfileSection title="Lifestyle" description="How work, commute, and travel shape your routine." icon={Workflow}>
          <LifestyleDetails preferences={preferences} />
        </ProfileSection>

        <ProfileSection title="Nutrition preferences" description="Food preferences that help Nuraa stay practical." icon={Utensils}>
          <NutritionDetails preferences={preferences} />
        </ProfileSection>

        <ProfileSection title="Permissions" description="Optional connections stay under your control." icon={ShieldCheck}>
          <PermissionsGrid permissions={permissions} />
        </ProfileSection>

        <Card className="flex flex-col justify-between gap-6 p-5">
          <div className="flex gap-3">
            <IconBadge icon={Leaf} />
            <div>
              <p className="font-semibold text-forest">Your data remains private.</p>
              <p className="mt-1 text-sm leading-6 text-ink/60">Nuraa saves only the foundation you chose to provide and keeps your controls visible.</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut} className="w-full sm:w-fit"><LogOut size={16} /> Logout</Button>
        </Card>
      </div>
    </div>
  )
}
