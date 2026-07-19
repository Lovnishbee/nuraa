import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import { Activity, Clock3, Flame, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'
import movementIllustration from '@/assets/dashboard/movement_illustration.png'
import { MobileHeader } from '@/components/app/MobileHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/input'
import { getProfileBundle } from '@/services/profile'
import { deleteWorkoutLog, getWorkoutLogs, saveWorkoutLog, updateWorkoutLog } from '@/services/workoutService'
import { useAuthStore } from '@/stores/auth-store'
import type { WorkoutActivityType, WorkoutIntensity, WorkoutLog } from '@/types/database'

const optionalNumber = z.preprocess((value) => value === '' ? undefined : value, z.coerce.number().min(0).optional())

const workoutSchema = z.object({
  activityType: z.enum(['walk', 'run', 'strength', 'mobility', 'yoga', 'cycling', 'sport', 'other']),
  title: z.string().trim().min(2, 'Add a workout title').max(120),
  durationMinutes: z.coerce.number().min(1).max(600),
  intensity: z.enum(['easy', 'moderate', 'hard']),
  caloriesBurned: optionalNumber,
  notes: z.string().max(240).optional(),
})

type WorkoutFormInput = z.input<typeof workoutSchema>
type WorkoutValues = z.output<typeof workoutSchema>

const activityTypes: Array<{ value: WorkoutActivityType; label: string }> = [
  { value: 'walk', label: 'Walk' },
  { value: 'run', label: 'Run' },
  { value: 'strength', label: 'Strength' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'sport', label: 'Sport' },
  { value: 'other', label: 'Other' },
]

const intensities: Array<{ value: WorkoutIntensity; label: string }> = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hard', label: 'Hard' },
]

const defaultWorkoutForm: WorkoutFormInput = { activityType: 'walk', title: '', durationMinutes: 20, intensity: 'moderate', notes: '' }

export function WorkoutsPage() {
  const user = useAuthStore((state) => state.user)!
  const queryClient = useQueryClient()
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null)
  const profile = useQuery({ queryKey: ['profile', user.id], queryFn: () => getProfileBundle(user.id) })
  const workouts = useQuery({ queryKey: ['workout-logs', user.id], queryFn: () => getWorkoutLogs(user.id) })
  const { register, handleSubmit, reset, formState: { errors } } = useForm<WorkoutFormInput, unknown, WorkoutValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues: defaultWorkoutForm,
  })

  const saveMutation = useMutation({
    mutationFn: (values: WorkoutValues) => {
      const payload = { ...values, timezone: profile.data?.profile.timezone }
      return editingWorkoutId ? updateWorkoutLog(user.id, editingWorkoutId, payload) : saveWorkoutLog(user.id, payload)
    },
    onSuccess: async () => {
      setEditingWorkoutId(null)
      reset(defaultWorkoutForm)
      await queryClient.invalidateQueries({ queryKey: ['workout-logs', user.id] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (workoutId: string) => deleteWorkoutLog(user.id, workoutId),
    onSuccess: async (_data, workoutId) => {
      if (editingWorkoutId === workoutId) {
        setEditingWorkoutId(null)
        reset(defaultWorkoutForm)
      }
      await queryClient.invalidateQueries({ queryKey: ['workout-logs', user.id] })
    },
  })

  const startEditing = (workout: WorkoutLog) => {
    setEditingWorkoutId(workout.id)
    reset({
      activityType: workout.activity_type,
      title: workout.title,
      durationMinutes: workout.duration_minutes,
      intensity: workout.intensity,
      caloriesBurned: workout.calories_burned ?? undefined,
      notes: workout.notes ?? '',
    })
  }

  const cancelEditing = () => {
    setEditingWorkoutId(null)
    reset(defaultWorkoutForm)
  }

  const totals = summarizeWorkouts(workouts.data ?? [])

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-5 sm:px-7 lg:px-10 lg:py-8">
      <MobileHeader userName={profile.data?.profile.full_name} avatarUrl={profile.data?.profile.avatar_url} />
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-nuraa">Workout</p>
        <h1 className="display mt-2 text-4xl leading-none text-forest sm:text-5xl">Track movement that fits today.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/62">Log completed activity manually. Nuraa uses this foundation for future adaptive movement guidance without generating workouts yet.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Quick log</p>
              <h2 className="mt-2 text-xl font-bold text-forest">{editingWorkoutId ? 'Edit completed activity' : 'Add completed activity'}</h2>
            </div>
            <img src={movementIllustration} alt="" className="size-16 rounded-3xl object-cover object-top" />
          </div>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-forest">Activity</span>
                <select className="h-12 w-full rounded-2xl border border-forest/12 bg-white/88 px-4 text-sm font-semibold text-forest outline-none focus:border-nuraa focus:ring-2 focus:ring-nuraa/14" {...register('activityType')}>
                  {activityTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-forest">Intensity</span>
                <select className="h-12 w-full rounded-2xl border border-forest/12 bg-white/88 px-4 text-sm font-semibold text-forest outline-none focus:border-nuraa focus:ring-2 focus:ring-nuraa/14" {...register('intensity')}>
                  {intensities.map((intensity) => <option key={intensity.value} value={intensity.value}>{intensity.label}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-forest">Title</span>
              <Input placeholder="e.g. Evening walk" {...register('title')} />
              {errors.title && <span className="mt-1 block text-xs text-red-700">{errors.title.message}</span>}
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Duration" placeholder="30 min" registration={register('durationMinutes')} />
              <NumberField label="Calories" placeholder="180" registration={register('caloriesBurned')} />
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-forest">Notes</span>
              <textarea rows={3} className="w-full resize-none rounded-2xl border border-forest/12 bg-white/88 px-4 py-3 text-sm text-ink outline-none focus:border-nuraa focus:ring-2 focus:ring-nuraa/14" placeholder="Optional context: pace, soreness, how it felt…" {...register('notes')} />
            </label>
            {saveMutation.isError && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">{saveMutation.error instanceof Error ? saveMutation.error.message : 'Could not save workout.'}</p>}
            {saveMutation.isSuccess && <p role="status" className="rounded-2xl bg-sage p-3 text-sm font-semibold text-forest">Workout saved.</p>}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" size="lg" className="w-full" disabled={saveMutation.isPending}>
                {editingWorkoutId ? <Pencil size={18} /> : <Plus size={18} />}
                {saveMutation.isPending ? 'Saving…' : editingWorkoutId ? 'Update workout' : 'Save workout'}
              </Button>
              {editingWorkoutId ? (
                <Button type="button" size="lg" variant="outline" className="w-full sm:w-auto" onClick={cancelEditing} disabled={saveMutation.isPending}>
                  <X size={18} /> Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile icon={Activity} label="Sessions" value={`${workouts.data?.length ?? 0}`} />
            <SummaryTile icon={Clock3} label="Minutes" value={`${totals.minutes}`} />
            <SummaryTile icon={Flame} label="Calories" value={totals.calories ? `${totals.calories}` : '—'} />
          </div>
          <Card className="p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Recent workouts</p>
              <h2 className="mt-1 text-xl font-bold text-forest">Your movement log</h2>
            </div>
            {workouts.isLoading ? <WorkoutSkeleton /> : null}
            {workouts.isError ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">{workouts.error instanceof Error ? workouts.error.message : 'Workouts could not be loaded.'}</p> : null}
            {!workouts.isLoading && !workouts.isError && (workouts.data?.length ?? 0) === 0 ? (
              <EmptyState title="No workouts logged yet" description="Add your first activity to start building a movement baseline." image={movementIllustration} />
            ) : null}
            <div className="space-y-3">
              {workouts.data?.map((workout) => (
                <WorkoutRow
                  key={workout.id}
                  workout={workout}
                  onEdit={() => startEditing(workout)}
                  onDelete={() => deleteMutation.mutate(workout.id)}
                  busy={deleteMutation.isPending || saveMutation.isPending}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function NumberField({ label, placeholder, registration }: { label: string; placeholder: string; registration: UseFormRegisterReturn }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-forest/80">{label}</span>
      <Input type="number" min={0} step="1" placeholder={placeholder} {...registration} />
    </label>
  )
}

function SummaryTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card className="p-4">
      <Icon className="text-nuraa" size={20} />
      <p className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-ink/48">{label}</p>
      <p className="mt-1 text-2xl font-bold text-forest">{value}</p>
    </Card>
  )
}

function WorkoutRow({ workout, onEdit, onDelete, busy }: { workout: WorkoutLog; onEdit: () => void; onDelete: () => void; busy: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-3xl border border-forest/10 bg-canvas p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.12em] text-nuraa">{workout.activity_type} · {workout.workout_date}</p>
        <h3 className="mt-1 font-bold text-forest">{workout.title}</h3>
        <p className="mt-1 text-sm leading-6 text-ink/58">{workout.notes || 'No extra notes'}</p>
        <p className="mt-2 text-xs font-semibold text-ink/50">{workout.duration_minutes} min · {workout.intensity} intensity{workout.calories_burned ? ` · ${workout.calories_burned} kcal` : ''}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} disabled={busy} aria-label={`Edit ${workout.title}`}><Pencil size={16} /></Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={busy} aria-label={`Delete ${workout.title}`}><Trash2 size={16} /></Button>
      </div>
    </div>
  )
}

function WorkoutSkeleton() {
  return <div className="h-32 animate-pulse rounded-3xl bg-sage/70" />
}

function summarizeWorkouts(workouts: WorkoutLog[]) {
  return workouts.reduce((total, workout) => ({
    minutes: total.minutes + workout.duration_minutes,
    calories: total.calories + (workout.calories_burned ?? 0),
  }), { minutes: 0, calories: 0 })
}
