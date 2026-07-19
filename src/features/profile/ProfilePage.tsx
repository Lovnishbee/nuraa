import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { CalendarDays, Camera, HeartPulse, Leaf, Loader2, LogOut, MapPin, Mic, Pencil, ShieldCheck, Sparkles, Target, Utensils, Workflow, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/IconBadge'
import { Input } from '@/components/ui/input'
import { logout } from '@/services/auth'
import { getCoachEligibility, setCoachConsent, updateCoachResponseDetail } from '@/services/coachService'
import { getProfileBundle, updateProfileFoundation, type ProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'
import type { HealthProfile, Profile, UserGoal, UserPermissions, UserPreferences } from '@/types/database'
import type { AIDetailLevel } from '@/features/ai/types'
import { cn } from '@/lib/utils'

const PROFILE_GOALS = ['Lose Weight', 'Gain Muscle', 'Improve Energy', 'Better Sleep', 'Improve Strength', 'Manage Diabetes', 'Manage PCOS', 'Manage Thyroid', 'Longevity']
const PROFILE_CONDITIONS = ['Diabetes', 'Hypertension', 'PCOS', 'Thyroid', 'Arthritis', 'None']

const profileEditSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name'),
  phone: z.string().max(32).optional(),
  age: z.coerce.number().min(13, 'Age must be 13 or above').max(110, 'Enter a valid age').optional().or(z.literal('')),
  gender: z.string().optional(),
  locationCity: z.string().max(80).optional(),
  locationCountry: z.string().max(80).optional(),
  timezone: z.string().min(3, 'Enter a valid timezone'),
  heightCm: z.coerce.number().min(80, 'Enter a valid height').max(260, 'Enter a valid height').optional().or(z.literal('')),
  weightKg: z.coerce.number().min(25, 'Enter a valid weight').max(350, 'Enter a valid weight').optional().or(z.literal('')),
  targetWeightKg: z.coerce.number().min(25, 'Enter a valid target').max(350, 'Enter a valid target').optional().or(z.literal('')),
  activityLevel: z.string().optional(),
  fitnessLevel: z.string().optional(),
  dietPreference: z.string().max(80).optional(),
  cuisinePreferencesText: z.string().max(240).optional(),
  dislikedFoodsText: z.string().max(240).optional(),
  workType: z.string().max(100).optional(),
  workSchedule: z.string().max(100).optional(),
  commuteMinutes: z.coerce.number().min(0, 'Commute cannot be negative').max(300, 'Enter a realistic commute').optional().or(z.literal('')),
  travelFrequency: z.string().max(80).optional(),
  goalLabels: z.array(z.string()).optional(),
  medicalConditions: z.array(z.string()).optional(),
  allergiesText: z.string().max(240).optional(),
  injuriesText: z.string().max(240).optional(),
  dietaryRestrictionsText: z.string().max(240).optional(),
})

type ProfileEditForm = z.infer<typeof profileEditSchema>

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
      <Field label="Injuries" value={healthProfile?.injuries?.length ? healthProfile.injuries.join(', ') : 'None shared'} />
      <Field label="Dietary restrictions" value={healthProfile?.dietary_restrictions?.length ? healthProfile.dietary_restrictions.join(', ') : 'None shared'} />
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

function toOptionalNumber(value: number | '' | undefined | null) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function toCommaText(values: string[] | null | undefined) {
  return values?.join(', ') ?? ''
}

function fromCommaText(value: string | undefined) {
  return (value ?? '').split(',').map((item) => item.trim()).filter(Boolean)
}

function profileEditDefaults(bundle: ProfileBundle): ProfileEditForm {
  return {
    fullName: bundle.profile.full_name ?? '',
    phone: bundle.profile.phone ?? '',
    age: bundle.profile.age ?? '',
    gender: bundle.profile.gender ?? '',
    locationCity: bundle.profile.location_city ?? '',
    locationCountry: bundle.profile.location_country ?? '',
    timezone: bundle.profile.timezone || 'Asia/Kolkata',
    heightCm: bundle.healthProfile?.height_cm ?? '',
    weightKg: bundle.healthProfile?.weight_kg ?? '',
    targetWeightKg: bundle.healthProfile?.target_weight_kg ?? '',
    activityLevel: bundle.healthProfile?.activity_level ?? '',
    fitnessLevel: bundle.healthProfile?.fitness_level ?? '',
    goalLabels: bundle.goals.filter((goal) => goal.status === 'active').map((goal) => goal.goal_label),
    medicalConditions: bundle.healthProfile?.medical_conditions?.length ? bundle.healthProfile.medical_conditions : [],
    allergiesText: toCommaText(bundle.healthProfile?.allergies),
    injuriesText: toCommaText(bundle.healthProfile?.injuries),
    dietaryRestrictionsText: toCommaText(bundle.healthProfile?.dietary_restrictions),
    dietPreference: bundle.preferences?.diet_preference ?? '',
    cuisinePreferencesText: toCommaText(bundle.preferences?.cuisine_preferences),
    dislikedFoodsText: toCommaText(bundle.preferences?.disliked_foods),
    workType: bundle.preferences?.work_type ?? '',
    workSchedule: bundle.preferences?.work_schedule ?? '',
    commuteMinutes: bundle.preferences?.commute_minutes ?? '',
    travelFrequency: bundle.preferences?.travel_frequency ?? '',
  }
}

function ProfileEditCard({ bundle, onCancel, onSaved }: { bundle: ProfileBundle; onCancel: () => void; onSaved: (updated: ProfileBundle) => void }) {
  const user = useAuthStore((state) => state.user)!
  const form = useForm<ProfileEditForm>({ resolver: zodResolver(profileEditSchema), defaultValues: profileEditDefaults(bundle) })
  const mutation = useMutation({
    mutationFn: (values: ProfileEditForm) => updateProfileFoundation(user.id, {
      fullName: values.fullName,
      phone: values.phone,
      age: toOptionalNumber(values.age),
      gender: values.gender,
      locationCity: values.locationCity,
      locationCountry: values.locationCountry,
      timezone: values.timezone,
      heightCm: toOptionalNumber(values.heightCm),
      weightKg: toOptionalNumber(values.weightKg),
      targetWeightKg: toOptionalNumber(values.targetWeightKg),
      activityLevel: values.activityLevel,
      fitnessLevel: values.fitnessLevel,
      dietPreference: values.dietPreference,
      cuisinePreferences: fromCommaText(values.cuisinePreferencesText),
      dislikedFoods: fromCommaText(values.dislikedFoodsText),
      workType: values.workType,
      workSchedule: values.workSchedule,
      commuteMinutes: toOptionalNumber(values.commuteMinutes),
      travelFrequency: values.travelFrequency,
      goalLabels: values.goalLabels ?? [],
      medicalConditions: values.medicalConditions?.includes('None') ? [] : values.medicalConditions,
      allergies: fromCommaText(values.allergiesText),
      injuries: fromCommaText(values.injuriesText),
      dietaryRestrictions: fromCommaText(values.dietaryRestrictionsText),
    }),
    onSuccess: onSaved,
  })

  return (
    <Card className="mt-8 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Edit profile</p>
          <h2 className="mt-1 text-2xl font-bold text-forest">Update your foundation</h2>
          <p className="mt-1 text-sm leading-6 text-ink/60">These fields update your profile, health baseline, goals, lifestyle, nutrition preferences, and health context.</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}><X size={15} /> Cancel</Button>
      </div>

      <form className="mt-6 grid gap-4 lg:grid-cols-2" onSubmit={(event) => void form.handleSubmit((values) => mutation.mutate(values))(event)}>
        <FormField label="Full name" error={form.formState.errors.fullName?.message}>
          <Input autoComplete="name" {...form.register('fullName')} />
        </FormField>
        <FormField label="Phone" error={form.formState.errors.phone?.message}>
          <Input autoComplete="tel" {...form.register('phone')} />
        </FormField>
        <FormField label="Age" error={form.formState.errors.age?.message}>
          <Input type="number" min={13} max={110} {...form.register('age')} />
        </FormField>
        <FormField label="Gender" error={form.formState.errors.gender?.message}>
          <select {...form.register('gender')} className="h-12 w-full rounded-2xl border border-forest/12 bg-white/88 px-4 text-sm text-ink outline-none focus:border-nuraa focus:ring-2 focus:ring-nuraa/14">
            <option value="">Select an option</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </FormField>
        <FormField label="City" error={form.formState.errors.locationCity?.message}>
          <Input autoComplete="address-level2" {...form.register('locationCity')} />
        </FormField>
        <FormField label="Country" error={form.formState.errors.locationCountry?.message}>
          <Input autoComplete="country-name" {...form.register('locationCountry')} />
        </FormField>
        <FormField label="Timezone" error={form.formState.errors.timezone?.message}>
          <Input placeholder="Asia/Kolkata" {...form.register('timezone')} />
        </FormField>
        <FormField label="Activity level" error={form.formState.errors.activityLevel?.message}>
          <select {...form.register('activityLevel')} className="h-12 w-full rounded-2xl border border-forest/12 bg-white/88 px-4 text-sm text-ink outline-none focus:border-nuraa focus:ring-2 focus:ring-nuraa/14">
            <option value="">Not set</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
        </FormField>
        <FormField label="Height (cm)" error={form.formState.errors.heightCm?.message}>
          <Input type="number" min={80} max={260} step="0.1" {...form.register('heightCm')} />
        </FormField>
        <FormField label="Weight (kg)" error={form.formState.errors.weightKg?.message}>
          <Input type="number" min={25} max={350} step="0.1" {...form.register('weightKg')} />
        </FormField>
        <FormField label="Target weight (kg)" error={form.formState.errors.targetWeightKg?.message}>
          <Input type="number" min={25} max={350} step="0.1" {...form.register('targetWeightKg')} />
        </FormField>
        <FormField label="Fitness level" error={form.formState.errors.fitnessLevel?.message}>
          <select {...form.register('fitnessLevel')} className="h-12 w-full rounded-2xl border border-forest/12 bg-white/88 px-4 text-sm text-ink outline-none focus:border-nuraa focus:ring-2 focus:ring-nuraa/14">
            <option value="">Not set</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </FormField>
        <FormGroup title="Goals" />
        <div className="lg:col-span-2">
          <MultiChoiceGrid
            options={PROFILE_GOALS}
            selected={form.watch('goalLabels') ?? []}
            onToggle={(value) => {
              const current = form.getValues('goalLabels') ?? []
              form.setValue('goalLabels', current.includes(value) ? current.filter((item) => item !== value) : [...current, value], { shouldDirty: true })
            }}
          />
        </div>
        <FormGroup title="Health context" />
        <div className="lg:col-span-2">
          <p className="mb-2 text-sm font-bold text-forest">Medical conditions</p>
          <MultiChoiceGrid
            options={PROFILE_CONDITIONS}
            selected={form.watch('medicalConditions') ?? []}
            onToggle={(value) => {
              const current = form.getValues('medicalConditions') ?? []
              const next = value === 'None'
                ? (current.includes('None') ? [] : ['None'])
                : (current.filter((item) => item !== 'None').includes(value) ? current.filter((item) => item !== value) : [...current.filter((item) => item !== 'None'), value])
              form.setValue('medicalConditions', next, { shouldDirty: true })
            }}
          />
        </div>
        <FormField label="Allergies" error={form.formState.errors.allergiesText?.message}>
          <Input placeholder="Comma separated, e.g. peanuts, shellfish" {...form.register('allergiesText')} />
        </FormField>
        <FormField label="Injuries" error={form.formState.errors.injuriesText?.message}>
          <Input placeholder="Comma separated, e.g. knee, shoulder" {...form.register('injuriesText')} />
        </FormField>
        <FormGroup title="Lifestyle" />
        <FormField label="Occupation / work type" error={form.formState.errors.workType?.message}>
          <Input placeholder="e.g. Desk work, consultant, doctor" {...form.register('workType')} />
        </FormField>
        <FormField label="Work schedule" error={form.formState.errors.workSchedule?.message}>
          <Input placeholder="e.g. 9 to 6, shifts, flexible" {...form.register('workSchedule')} />
        </FormField>
        <FormField label="Commute minutes" error={form.formState.errors.commuteMinutes?.message}>
          <Input type="number" min={0} max={300} {...form.register('commuteMinutes')} />
        </FormField>
        <FormField label="Travel frequency" error={form.formState.errors.travelFrequency?.message}>
          <Input placeholder="e.g. Rarely, sometimes, weekly" {...form.register('travelFrequency')} />
        </FormField>
        <FormGroup title="Nutrition" />
        <FormField label="Diet preference" error={form.formState.errors.dietPreference?.message}>
          <Input placeholder="e.g. Vegetarian, omnivore, vegan" {...form.register('dietPreference')} />
        </FormField>
        <FormField label="Cuisine preferences" error={form.formState.errors.cuisinePreferencesText?.message}>
          <Input placeholder="Comma separated, e.g. Indian, Thai" {...form.register('cuisinePreferencesText')} />
        </FormField>
        <FormField label="Disliked foods" error={form.formState.errors.dislikedFoodsText?.message}>
          <Input placeholder="Comma separated, e.g. olives, mushrooms" {...form.register('dislikedFoodsText')} />
        </FormField>
        <FormField label="Dietary restrictions" error={form.formState.errors.dietaryRestrictionsText?.message}>
          <Input placeholder="Comma separated, e.g. gluten-free, dairy-free" {...form.register('dietaryRestrictionsText')} />
        </FormField>

        {mutation.error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 lg:col-span-2">Unable to save profile changes. Please try again.</p>}

        <div className="flex flex-col gap-3 sm:flex-row lg:col-span-2">
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />} Save changes</Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>Cancel</Button>
        </div>
      </form>
    </Card>
  )
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold text-forest">
      <span>{label}</span>
      <span className="mt-2 block">{children}</span>
      {error && <span className="mt-1 block text-xs font-semibold text-red-700">{error}</span>}
    </label>
  )
}

function FormGroup({ title }: { title: string }) {
  return <h3 className="border-t border-forest/10 pt-5 text-xs font-bold uppercase tracking-[.14em] text-nuraa lg:col-span-2">{title}</h3>
}

function MultiChoiceGrid({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((option) => (
        <button
          type="button"
          key={option}
          onClick={() => onToggle(option)}
          className={cn('flex min-h-12 items-center justify-between rounded-2xl border px-4 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nuraa/20', selected.includes(option) ? 'border-nuraa bg-sage text-forest' : 'border-forest/12 bg-white/88 text-forest/72 hover:border-nuraa/40')}
          aria-pressed={selected.includes(option)}
        >
          <span>{option}</span>
          <span aria-hidden="true" className={cn('grid size-5 place-items-center rounded-full border', selected.includes(option) ? 'border-nuraa bg-nuraa text-white' : 'border-forest/20 text-transparent')}>✓</span>
        </button>
      ))}
    </div>
  )
}

export function ProfilePage() {
  const user = useAuthStore((state) => state.user)!
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const bundle = useQuery({ queryKey: ['profile', user.id], queryFn: () => getProfileBundle(user.id) })
  const coach = useQuery({ queryKey: ['coach-eligibility', user.id], queryFn: getCoachEligibility })

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
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil size={15} /> Edit profile</Button>
      </header>

      {editing
        ? <ProfileEditCard
            bundle={bundle.data}
            onCancel={() => setEditing(false)}
            onSaved={(updated) => {
              queryClient.setQueryData(['profile', user.id], updated)
              setEditing(false)
            }}
          />
        : <ProfileHeroCard profile={profile} email={user.email} activeGoals={activeGoals} />}

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

        <ProfileSection title="AI Coach" description="Private-beta Coach controls for contextual wellness guidance." icon={Sparkles}>
          <CoachControls
            enabled={Boolean(coach.data?.coachEnabled)}
            canUseCoach={Boolean(coach.data)}
            detailLevel={coach.data?.responseDetail ?? 'balanced'}
            onToggle={(enabled) => setCoachConsent(user.id, enabled, coach.data?.responseDetail ?? 'balanced').then(() => coach.refetch())}
            onDetailChange={(detail) => updateCoachResponseDetail(user.id, detail).then(() => coach.refetch())}
          />
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

function CoachControls({ enabled, canUseCoach, detailLevel, onToggle, onDetailChange }: { enabled: boolean; canUseCoach: boolean; detailLevel: AIDetailLevel; onToggle: (enabled: boolean) => Promise<unknown>; onDetailChange: (detail: AIDetailLevel) => Promise<unknown> }) {
  const [busy, setBusy] = useState(false)
  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-4">
      {!canUseCoach && <p className="rounded-2xl bg-canvas p-4 text-sm leading-6 text-ink/62">Sign in to manage AI Coach controls.</p>}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-forest/8 bg-canvas/70 p-4">
        <div>
          <p className="font-semibold text-forest">AI Coach</p>
          <p className="mt-1 text-sm leading-5 text-ink/58">Use recent wellness context for general guidance. No diagnosis or prescriptions.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={!canUseCoach || busy}
          onClick={() => void run(() => onToggle(!enabled))}
          className={cn('relative h-8 w-14 shrink-0 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nuraa/25 disabled:opacity-50', enabled ? 'border-forest bg-forest' : 'border-forest/14 bg-white')}
        >
          <span className={cn('absolute top-1 grid size-6 place-items-center rounded-full bg-white shadow-sm transition', enabled ? 'left-7 text-forest' : 'left-1 text-ink/45')} />
        </button>
      </div>
      <label className="block text-sm font-bold text-forest" htmlFor="profile-coach-detail">Response detail</label>
      <select id="profile-coach-detail" value={detailLevel} disabled={!canUseCoach || busy} onChange={(event) => void run(() => onDetailChange(event.target.value as AIDetailLevel))} className="w-full rounded-2xl border border-forest/12 bg-white px-3 py-2 text-sm text-forest disabled:opacity-50">
        <option value="concise">Concise</option>
        <option value="balanced">Balanced</option>
        <option value="detailed">Detailed</option>
      </select>
    </div>
  )
}
