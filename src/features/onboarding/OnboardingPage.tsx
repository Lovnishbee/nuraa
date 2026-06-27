import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { Bell, CalendarDays, Camera, Check, ChevronRight, HeartPulse, MapPin, Mic, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { completeOnboarding, saveBasicDetails, saveGoals, saveMedical, savePermissions, savePreferences } from '@/services/onboarding'
import { getProfileBundle, type ProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'
import { getNextOnboardingPath, type OnboardingPath } from './flow'
import { clearOnboardingResumePath, saveOnboardingResumePath } from './progress'

const goals = ['Lose Weight', 'Gain Muscle', 'Improve Energy', 'Better Sleep', 'Improve Strength', 'Manage Diabetes', 'Manage PCOS', 'Manage Thyroid', 'Longevity']
const conditions = ['Diabetes', 'Hypertension', 'PCOS', 'Thyroid', 'Arthritis', 'None']
const cuisines = ['Indian', 'Mediterranean', 'Asian', 'Continental']

const basicSchema = z.object({
  fullName: z.string().min(2, 'Enter your name'),
  age: z.coerce.number().int().min(13, 'Age must be 13 or above').max(120),
  gender: z.string().min(1, 'Choose an option'),
  height: z.coerce.number().positive('Enter your height'),
  weight: z.coerce.number().positive('Enter your weight'),
})

const lifestyleSchema = z.object({
  workType: z.string().min(2, 'Enter your occupation'),
  workSchedule: z.string().min(1, 'Choose a schedule'),
  travelFrequency: z.string().min(1, 'Choose travel frequency'),
  commuteMinutes: z.coerce.number().int().min(0),
})

const nutritionSchema = z.object({
  dietPreference: z.string().min(1, 'Choose your preference'),
  cuisinePreferences: z.array(z.string()).min(1, 'Choose at least one cuisine'),
  allergies: z.string(),
  dislikedFoods: z.string(),
})

type BasicValues = z.infer<typeof basicSchema>
type LifestyleValues = z.infer<typeof lifestyleSchema>
type NutritionValues = z.infer<typeof nutritionSchema>

function getUserMetadataFullName(user: User | null) {
  const fullName = user?.user_metadata?.full_name
  return typeof fullName === 'string' ? fullName : ''
}

function asOptionalNumber(value: number | null | undefined) {
  return value ?? undefined
}

export function OnboardingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const path = location.pathname as OnboardingPath
  const [error, setError] = useState<string | null>(null)
  const next = getNextOnboardingPath(path)
  const goNext = () => navigate(next ?? '/app/dashboard')
  const metadataFullName = getUserMetadataFullName(user)

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfileBundle(user!.id),
    enabled: Boolean(user),
  })

  const basic = useForm<BasicValues>({
    resolver: zodResolver(basicSchema),
    defaultValues: { fullName: metadataFullName, age: undefined, gender: '', height: undefined, weight: undefined },
  })
  const lifestyle = useForm<LifestyleValues>({
    resolver: zodResolver(lifestyleSchema),
    defaultValues: { workType: '', workSchedule: '', travelFrequency: '', commuteMinutes: 0 },
  })
  const nutrition = useForm<NutritionValues>({
    resolver: zodResolver(nutritionSchema),
    defaultValues: { dietPreference: '', cuisinePreferences: [], allergies: '', dislikedFoods: '' },
  })
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  const [permissions, setPermissions] = useState({
    calendar_connected: false,
    location_enabled: false,
    notifications_enabled: false,
    camera_enabled: false,
    microphone_enabled: false,
    health_reports_enabled: false,
  })

  const profileBundle = profileQuery.data

  useEffect(() => {
    if (path !== '/onboarding/basic-details') return
    basic.reset({
      fullName: profileBundle?.profile.full_name || metadataFullName,
      age: asOptionalNumber(profileBundle?.profile.age),
      gender: profileBundle?.profile.gender ?? '',
      height: asOptionalNumber(profileBundle?.healthProfile?.height_cm),
      weight: asOptionalNumber(profileBundle?.healthProfile?.weight_kg),
    }, { keepDirtyValues: true })
  }, [basic, metadataFullName, path, profileBundle])

  if (!user) return null
  const userId = user.id

  async function save(task: () => Promise<void>, destination = true) {
    try {
      setError(null)
      await task()
      if (destination) {
        if (next) saveOnboardingResumePath(userId, next)
        goNext()
      }
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your progress.')
      return false
    }
  }

  async function finishSetup() {
    const saved = await save(async () => {
      await savePermissions(userId, permissions)
      await completeOnboarding(userId)
    }, false)

    if (!saved) return

    queryClient.setQueryData<ProfileBundle>(['profile', userId], (current) => current
      ? { ...current, profile: { ...current.profile, onboarding_completed: true } }
      : current)
    clearOnboardingResumePath(userId)
    navigate('/app/dashboard', { replace: true })
    void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
  }

  const intros: Record<OnboardingPath, [string, string, string]> = {
    '/onboarding/basic-details': ['Basic details', 'Let’s start with the basics.', 'A few essentials help Nuraa understand your health context.'],
    '/onboarding/goals': ['Your goals', 'What would you like to work toward?', 'Choose what matters most right now. You can select more than one.'],
    '/onboarding/lifestyle': ['Your lifestyle', 'Tell us about your rhythm.', 'Your schedule helps Nuraa respect the pace of your real life.'],
    '/onboarding/nutrition': ['Nutrition preferences', 'Let’s personalise your nutrition.', 'Small preferences make future meal guidance feel more like yours.'],
    '/onboarding/medical': ['Health context', 'Help us understand your health.', 'Share only what feels relevant. This creates a safer foundation.'],
    '/onboarding/connect': ['Connect your life', 'Make Nuraa smarter over time.', 'Every connection is optional. You stay in control.'],
  }
  const [eyebrow, title, copy] = intros[path]

  return (
    <Card className="mx-auto max-w-2xl p-5 sm:p-8 lg:p-10">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">{eyebrow}</p>
      <h2 className="display mt-3 text-4xl leading-none text-forest sm:text-5xl">{title}</h2>
      <p className="mt-4 max-w-xl text-sm leading-6 text-ink/65">{copy}</p>

      {path === '/onboarding/basic-details' && (
        <form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={basic.handleSubmit((values) => save(() => saveBasicDetails(user.id, { full_name: values.fullName, age: values.age, gender: values.gender }, { height_cm: values.height, weight_kg: values.weight })))}>
          <FormField label="Full name" error={basic.formState.errors.fullName?.message} className="sm:col-span-2">
            <Input placeholder="Your full name" autoComplete="name" {...basic.register('fullName')} />
          </FormField>
          <FormField label="Age" error={basic.formState.errors.age?.message}>
            <Input type="number" placeholder="e.g. 28" {...basic.register('age')} />
          </FormField>
          <SelectField label="Gender" error={basic.formState.errors.gender?.message} {...basic.register('gender')} options={['Female', 'Male', 'Non-binary', 'Prefer not to say']} />
          <FormField label="Height (cm)" error={basic.formState.errors.height?.message}>
            <Input type="number" placeholder="e.g. 175" {...basic.register('height')} />
          </FormField>
          <FormField label="Weight (kg)" error={basic.formState.errors.weight?.message}>
            <Input type="number" step="0.1" placeholder="e.g. 70" {...basic.register('weight')} />
          </FormField>
          <ActionButton pending={basic.formState.isSubmitting} />
        </form>
      )}

      {path === '/onboarding/goals' && (
        <div className="mt-8">
          <ChoiceGrid options={goals} selected={selectedGoals} onToggle={(value) => setSelectedGoals((all) => all.includes(value) ? all.filter((item) => item !== value) : [...all, value])} />
          <ActionButton pending={false} disabled={!selectedGoals.length} onClick={() => save(() => saveGoals(user.id, selectedGoals))} />
        </div>
      )}

      {path === '/onboarding/lifestyle' && (
        <form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={lifestyle.handleSubmit((values) => save(() => savePreferences(user.id, { work_type: values.workType, work_schedule: values.workSchedule, travel_frequency: values.travelFrequency, commute_minutes: values.commuteMinutes })))}>
          <FormField label="Occupation" error={lifestyle.formState.errors.workType?.message}>
            <Input placeholder="e.g. Consultant, Engineer, Doctor" {...lifestyle.register('workType')} />
          </FormField>
          <SelectField label="Work schedule" error={lifestyle.formState.errors.workSchedule?.message} {...lifestyle.register('workSchedule')} options={['Mostly daytime', 'Shift work', 'Flexible', 'Night shifts']} />
          <SelectField label="Travel frequency" error={lifestyle.formState.errors.travelFrequency?.message} {...lifestyle.register('travelFrequency')} options={['Rarely', 'Sometimes', 'Often', 'Very often']} />
          <FormField label="Commute time (minutes)" error={lifestyle.formState.errors.commuteMinutes?.message}>
            <Input type="number" {...lifestyle.register('commuteMinutes')} />
          </FormField>
          <ActionButton pending={lifestyle.formState.isSubmitting} />
        </form>
      )}

      {path === '/onboarding/nutrition' && (
        <form className="mt-8 space-y-5" onSubmit={nutrition.handleSubmit((values) => save(() => savePreferences(user.id, {
          diet_preference: values.dietPreference,
          cuisine_preferences: values.cuisinePreferences,
          allergies: values.allergies ? values.allergies.split(',').map((item) => item.trim()).filter(Boolean) : [],
          disliked_foods: values.dislikedFoods ? values.dislikedFoods.split(',').map((item) => item.trim()).filter(Boolean) : [],
        })))}>
          <SelectField label="Diet preference" error={nutrition.formState.errors.dietPreference?.message} {...nutrition.register('dietPreference')} options={['Omnivore', 'Vegetarian', 'Vegan', 'Pescatarian', 'Other']} />
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-forest">Cuisine preferences</legend>
            <ChoiceGrid compact options={cuisines} selected={nutrition.watch('cuisinePreferences')} onToggle={(value) => {
              const current = nutrition.getValues('cuisinePreferences')
              nutrition.setValue('cuisinePreferences', current.includes(value) ? current.filter((item) => item !== value) : [...current, value], { shouldValidate: true })
            }} />
            {nutrition.formState.errors.cuisinePreferences && <p className="mt-2 text-xs text-red-700">{nutrition.formState.errors.cuisinePreferences.message}</p>}
          </fieldset>
          <FormField label="Allergies" hint="Optional — separate with commas">
            <Input placeholder="e.g. Peanuts, shellfish" {...nutrition.register('allergies')} />
          </FormField>
          <FormField label="Disliked foods" hint="Optional — separate with commas">
            <Input placeholder="e.g. Mushrooms, olives" {...nutrition.register('dislikedFoods')} />
          </FormField>
          <ActionButton pending={nutrition.formState.isSubmitting} />
        </form>
      )}

      {path === '/onboarding/medical' && (
        <div className="mt-8">
          <p className="mb-3 text-sm font-semibold text-forest">Do any of these apply?</p>
          <ChoiceGrid options={conditions} selected={selectedConditions} onToggle={(value) => setSelectedConditions((all) => value === 'None' ? (all.includes('None') ? [] : ['None']) : (all.filter((item) => item !== 'None').includes(value) ? all.filter((item) => item !== value) : [...all.filter((item) => item !== 'None'), value]))} />
          <FormField className="mt-5" label="Allergies or other context" hint="Optional — separate with commas">
            <Input placeholder="Anything relevant to your care" onBlur={(event) => event.currentTarget.dataset.value = event.currentTarget.value} />
          </FormField>
          <ActionButton pending={false} onClick={() => save(() => saveMedical(user.id, selectedConditions.filter((item) => item !== 'None'), []))} />
        </div>
      )}

      {path === '/onboarding/connect' && (
        <div className="mt-8 space-y-3">
          {[
            [CalendarDays, 'calendar_connected', 'Calendar', 'Coming soon — schedule intelligence will arrive in a later phase.', true],
            [MapPin, 'location_enabled', 'Location', 'Support context-aware recommendations, if you choose.', false],
            [Bell, 'notifications_enabled', 'Notifications', 'A gentle reminder when it is useful.', false],
            [Camera, 'camera_enabled', 'Camera', 'Coming soon — meal capture is not included in Phase 1.', true],
            [Mic, 'microphone_enabled', 'Microphone', 'Coming soon — voice is not included in Phase 1.', true],
            [HeartPulse, 'health_reports_enabled', 'Health reports', 'Coming soon — health reports are not included in Phase 1.', true],
          ].map(([Icon, key, name, description, soon]) => {
            const PermissionIcon = Icon as typeof Bell
            const permissionKey = key as keyof typeof permissions
            return (
              <button type="button" key={permissionKey} onClick={() => !soon && setPermissions((all) => ({ ...all, [permissionKey]: !all[permissionKey] }))} disabled={Boolean(soon)} className={cn('flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition', permissions[permissionKey] ? 'border-nuraa bg-sage' : 'border-forest/10 bg-white', soon && 'cursor-not-allowed opacity-70')}>
                <span className="grid size-10 place-items-center rounded-xl bg-sage text-nuraa"><PermissionIcon size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-forest">{name as string}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-ink/60">{description as string}</span>
                </span>
                {soon
                  ? <span className="text-[10px] font-bold uppercase tracking-wide text-forest/50">Soon</span>
                  : <span className={cn('grid size-6 place-items-center rounded-full border', permissions[permissionKey] ? 'border-nuraa bg-nuraa text-white' : 'border-forest/20 text-transparent')}><Check size={14} /></span>}
              </button>
            )
          })}
          <ActionButton pending={false} label="Finish setup" onClick={finishSetup} />
          <p className="flex items-center justify-center gap-2 text-xs text-forest/60"><ShieldCheck size={15} className="text-nuraa" /> You can change connections later.</p>
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    </Card>
  )
}

function FormField({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return <label className={cn('block', className)}><span className="mb-2 block text-sm font-semibold text-forest">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs text-ink/50">{hint}</span>}{error && <span className="mt-1.5 block text-xs text-red-700">{error}</span>}</label>
}

function SelectField({ label, error, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; options: string[] }) {
  return <FormField label={label} error={error}><select className="h-12 w-full rounded-2xl border border-forest/15 bg-white px-4 text-sm text-ink outline-none focus:border-nuraa focus:ring-2 focus:ring-nuraa/15" {...props}><option value="">Select an option</option>{options.map((option) => <option key={option}>{option}</option>)}</select></FormField>
}

function ChoiceGrid({ options, selected, onToggle, compact = false }: { options: string[]; selected: string[]; onToggle: (value: string) => void; compact?: boolean }) {
  return <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'sm:grid-cols-3')}>{options.map((option) => <button type="button" key={option} onClick={() => onToggle(option)} className={cn('flex min-h-15 items-center justify-between rounded-2xl border px-4 text-left text-sm font-medium transition', selected.includes(option) ? 'border-nuraa bg-sage text-forest' : 'border-forest/12 bg-white text-forest/75 hover:border-nuraa/40')}><span>{option}</span><span className={cn('grid size-5 place-items-center rounded-full border', selected.includes(option) ? 'border-nuraa bg-nuraa text-white' : 'border-forest/20 text-transparent')}><Check size={12} /></span></button>)}</div>
}

function ActionButton({ onClick, pending, disabled, label = 'Continue' }: { onClick?: () => void; pending: boolean; disabled?: boolean; label?: string }) {
  return <Button type={onClick ? 'button' : 'submit'} onClick={onClick} disabled={pending || disabled} size="lg" className="mt-6 w-full">{pending ? 'Saving…' : <>{label}<ChevronRight size={17} /></>}</Button>
}
