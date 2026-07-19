import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import { Apple, Flame, Pencil, Plus, Trash2, Utensils, X } from 'lucide-react'
import { useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'
import healthyMealIllustration from '@/assets/dashboard/healthy_meals_illustration.png'
import { MobileHeader } from '@/components/app/MobileHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/input'
import { deleteMealLog, getMealLogs, saveMealLog, updateMealLog } from '@/services/mealService'
import { getProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'
import type { MealLog, MealType } from '@/types/database'

const optionalNumber = z.preprocess((value) => value === '' ? undefined : value, z.coerce.number().min(0).optional())

const mealSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  mealName: z.string().trim().min(2, 'Add a meal name').max(120),
  notes: z.string().max(240).optional(),
  calories: optionalNumber,
  proteinG: optionalNumber,
  carbsG: optionalNumber,
  fatG: optionalNumber,
})

type MealFormInput = z.input<typeof mealSchema>
type MealValues = z.output<typeof mealSchema>

const mealTypes: Array<{ value: MealType; label: string }> = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

const defaultMealForm: MealFormInput = { mealType: 'lunch', mealName: '', notes: '' }

export function MealsPage() {
  const user = useAuthStore((state) => state.user)!
  const queryClient = useQueryClient()
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const profile = useQuery({ queryKey: ['profile', user.id], queryFn: () => getProfileBundle(user.id) })
  const meals = useQuery({ queryKey: ['meal-logs', user.id], queryFn: () => getMealLogs(user.id) })
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MealFormInput, unknown, MealValues>({
    resolver: zodResolver(mealSchema),
    defaultValues: defaultMealForm,
  })

  const saveMutation = useMutation({
    mutationFn: (values: MealValues) => {
      const payload = { ...values, timezone: profile.data?.profile.timezone }
      return editingMealId ? updateMealLog(user.id, editingMealId, payload) : saveMealLog(user.id, payload)
    },
    onSuccess: async () => {
      setEditingMealId(null)
      reset(defaultMealForm)
      await queryClient.invalidateQueries({ queryKey: ['meal-logs', user.id] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (mealId: string) => deleteMealLog(user.id, mealId),
    onSuccess: async (_data, mealId) => {
      if (editingMealId === mealId) {
        setEditingMealId(null)
        reset(defaultMealForm)
      }
      await queryClient.invalidateQueries({ queryKey: ['meal-logs', user.id] })
    },
  })

  const startEditing = (meal: MealLog) => {
    setEditingMealId(meal.id)
    reset({
      mealType: meal.meal_type,
      mealName: meal.meal_name,
      notes: meal.notes ?? '',
      calories: meal.calories ?? undefined,
      proteinG: meal.protein_g ?? undefined,
      carbsG: meal.carbs_g ?? undefined,
      fatG: meal.fat_g ?? undefined,
    })
  }

  const cancelEditing = () => {
    setEditingMealId(null)
    reset(defaultMealForm)
  }

  const totals = summarizeMeals(meals.data ?? [])

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-5 sm:px-7 lg:px-10 lg:py-8">
      <MobileHeader userName={profile.data?.profile.full_name} avatarUrl={profile.data?.profile.avatar_url} />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-nuraa">Meals</p>
          <h1 className="display mt-2 text-4xl leading-none text-forest sm:text-5xl">Log meals without judgement.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/62">Track simple food signals so Nuraa can understand your nutrition rhythm over time. Photo and AI meal analysis stay off for now.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Quick log</p>
              <h2 className="mt-2 text-xl font-bold text-forest">{editingMealId ? 'Edit meal' : 'Add a meal'}</h2>
            </div>
            <img src={healthyMealIllustration} alt="" className="size-16 rounded-3xl object-cover object-top" />
          </div>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-forest">Meal type</span>
              <select className="h-12 w-full rounded-2xl border border-forest/12 bg-white/88 px-4 text-sm font-semibold text-forest outline-none focus:border-nuraa focus:ring-2 focus:ring-nuraa/14" {...register('mealType')}>
                {mealTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-forest">Meal name</span>
              <Input placeholder="e.g. Dal, rice, curd, salad" {...register('mealName')} />
              {errors.mealName && <span className="mt-1 block text-xs text-red-700">{errors.mealName.message}</span>}
            </label>
            <div className="grid gap-3 sm:grid-cols-4">
              <NumberField label="Calories" placeholder="520" registration={register('calories')} />
              <NumberField label="Protein" placeholder="30g" registration={register('proteinG')} />
              <NumberField label="Carbs" placeholder="65g" registration={register('carbsG')} />
              <NumberField label="Fat" placeholder="18g" registration={register('fatG')} />
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-forest">Notes</span>
              <textarea rows={3} className="w-full resize-none rounded-2xl border border-forest/12 bg-white/88 px-4 py-3 text-sm text-ink outline-none focus:border-nuraa focus:ring-2 focus:ring-nuraa/14" placeholder="Optional context: homemade, outside meal, timing, hunger cues…" {...register('notes')} />
            </label>
            {saveMutation.isError && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">{saveMutation.error instanceof Error ? saveMutation.error.message : 'Could not save meal.'}</p>}
            {saveMutation.isSuccess && <p role="status" className="rounded-2xl bg-sage p-3 text-sm font-semibold text-forest">Meal {editingMealId ? 'updated' : 'saved'}.</p>}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" size="lg" className="w-full" disabled={saveMutation.isPending}>
                {editingMealId ? <Pencil size={18} /> : <Plus size={18} />}
                {saveMutation.isPending ? 'Saving…' : editingMealId ? 'Update meal' : 'Save meal'}
              </Button>
              {editingMealId ? (
                <Button type="button" size="lg" variant="outline" className="w-full sm:w-auto" onClick={cancelEditing} disabled={saveMutation.isPending}>
                  <X size={18} /> Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile icon={Utensils} label="Meals logged" value={`${meals.data?.length ?? 0}`} />
            <SummaryTile icon={Flame} label="Calories" value={totals.calories ? `${totals.calories}` : '—'} />
            <SummaryTile icon={Apple} label="Protein" value={totals.protein ? `${totals.protein}g` : '—'} />
          </div>
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Recent meals</p>
                <h2 className="mt-1 text-xl font-bold text-forest">Your meal log</h2>
              </div>
            </div>
            {meals.isLoading ? <MealSkeleton /> : null}
            {meals.isError ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">{meals.error instanceof Error ? meals.error.message : 'Meals could not be loaded.'}</p> : null}
            {!meals.isLoading && !meals.isError && (meals.data?.length ?? 0) === 0 ? (
              <EmptyState title="No meals logged yet" description="Add your first meal to start building a simple nutrition baseline." image={healthyMealIllustration} />
            ) : null}
            <div className="space-y-3">
              {meals.data?.map((meal) => (
                <MealRow
                  key={meal.id}
                  meal={meal}
                  onEdit={() => startEditing(meal)}
                  onDelete={() => deleteMutation.mutate(meal.id)}
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

function MealRow({ meal, onEdit, onDelete, busy }: { meal: MealLog; onEdit: () => void; onDelete: () => void; busy: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-3xl border border-forest/10 bg-canvas p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.12em] text-nuraa">{meal.meal_type} · {meal.meal_date}</p>
        <h3 className="mt-1 font-bold text-forest">{meal.meal_name}</h3>
        <p className="mt-1 text-sm leading-6 text-ink/58">{meal.notes || 'No extra notes'}</p>
        <p className="mt-2 text-xs font-semibold text-ink/50">{[meal.calories ? `${meal.calories} kcal` : null, meal.protein_g ? `${meal.protein_g}g protein` : null, meal.carbs_g ? `${meal.carbs_g}g carbs` : null, meal.fat_g ? `${meal.fat_g}g fat` : null].filter(Boolean).join(' · ') || 'Macros not added'}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} disabled={busy} aria-label={`Edit ${meal.meal_name}`}><Pencil size={16} /></Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={busy} aria-label={`Delete ${meal.meal_name}`}><Trash2 size={16} /></Button>
      </div>
    </div>
  )
}

function MealSkeleton() {
  return <div className="h-32 animate-pulse rounded-3xl bg-sage/70" />
}

function summarizeMeals(meals: MealLog[]) {
  return meals.reduce((total, meal) => ({
    calories: total.calories + (meal.calories ?? 0),
    protein: total.protein + (meal.protein_g ?? 0),
  }), { calories: 0, protein: 0 })
}
