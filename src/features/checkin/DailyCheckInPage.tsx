import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Battery, Brain, Heart, Moon, Smile, Sparkles, Zap } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { MobileHeader } from '@/components/app/MobileHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import recoveryIllustration from '@/assets/dashboard/recovery_illustration.png'
import reflectionIllustration from '@/assets/dashboard/reflection_illustration.png'
import { saveDailyCheckIn } from '@/services/checkins'
import { getProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'
import { useCheckInStore } from '@/stores/checkin-store'
import { cn } from '@/lib/utils'

const checkInSchema = z.object({
  mood: z.string().min(1, 'Choose your mood'),
  energyLevel: z.number().min(1).max(5),
  sleepQuality: z.number().min(1).max(5),
  soreness: z.number().min(1).max(5),
  stressLevel: z.number().min(1).max(5),
  motivation: z.number().min(1).max(5),
  sleepHours: z.coerce.number().min(0).max(16).optional(),
  reflection: z.string().max(300).optional(),
})

type CheckInValues = z.infer<typeof checkInSchema>

const moodOptions = [
  { value: 'very_low', label: 'Very low', icon: '😟' },
  { value: 'low', label: 'Low', icon: '🙁' },
  { value: 'okay', label: 'Okay', icon: '🙂' },
  { value: 'good', label: 'Good', icon: '😊' },
  { value: 'great', label: 'Great', icon: '😌' },
]

const scaleFields = [
  { name: 'energyLevel', label: 'Energy', icon: Zap, low: 'Low', high: 'High' },
  { name: 'sleepQuality', label: 'Sleep quality', icon: Moon, low: 'Poor', high: 'Excellent' },
  { name: 'soreness', label: 'Soreness', icon: Heart, low: 'None', high: 'High' },
  { name: 'stressLevel', label: 'Stress', icon: Brain, low: 'Calm', high: 'High' },
  { name: 'motivation', label: 'Motivation', icon: Battery, low: 'Low', high: 'High' },
] as const

export function DailyCheckInPage() {
  const user = useAuthStore((state) => state.user)!
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const draftNotes = useCheckInStore((state) => state.draftNotes)
  const setDraftNotes = useCheckInStore((state) => state.setDraftNotes)
  const markSaved = useCheckInStore((state) => state.markSaved)
  const { control, register, handleSubmit, watch, formState: { errors } } = useForm<CheckInValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: { mood: 'good', energyLevel: 3, sleepQuality: 3, soreness: 2, stressLevel: 3, motivation: 3, sleepHours: 7, reflection: draftNotes },
  })

  const profile = queryClient.getQueryData<Awaited<ReturnType<typeof getProfileBundle>>>(['profile', user.id])
  const mutation = useMutation({
    mutationFn: (values: CheckInValues) => saveDailyCheckIn(user.id, values),
    onSuccess: () => {
      markSaved()
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary', user.id] })
    },
  })

  useEffect(() => {
    if (!mutation.isSuccess) return
    const timeout = window.setTimeout(() => navigate('/app/dashboard', { replace: true }), 1700)
    return () => window.clearTimeout(timeout)
  }, [mutation.isSuccess, navigate])

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-5 sm:px-7 lg:px-10 lg:py-8">
      <MobileHeader userName={profile?.profile.full_name} avatarUrl={profile?.profile.avatar_url} />
      <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="hidden rounded-[32px] border border-forest/10 bg-white p-7 shadow-sm lg:block">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Daily ritual</p>
          <h1 className="display mt-4 text-5xl leading-none text-forest">A quick read on how you feel today.</h1>
          <p className="mt-5 text-sm leading-6 text-ink/62">Your check-in powers your dashboard and helps Nuraa learn your patterns over time.</p>
          <EmptyState title="Private by design" description="Your check-in saves only to your Nuraa account." image={reflectionIllustration} className="mt-8" />
        </aside>

        <Card className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Daily check-in</p>
              <h1 className="display mt-2 text-4xl leading-none text-forest">How is your body today?</h1>
              <p className="mt-2 text-sm text-ink/60">A one-minute check-in helps Nuraa understand your readiness for the day.</p>
            </div>
            <img src={recoveryIllustration} alt="" className="hidden size-20 rounded-3xl object-cover object-top sm:block" />
          </div>

          <form className="mt-7 space-y-6" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
            <Controller control={control} name="mood" render={({ field }) => (
              <fieldset>
                <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-forest"><Smile size={18} className="text-nuraa" /> Mood</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {moodOptions.map((option) => (
                    <button key={option.value} type="button" aria-pressed={field.value === option.value} onClick={() => field.onChange(option.value)} className={cn('rounded-2xl border p-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nuraa/25', field.value === option.value ? 'border-nuraa bg-sage text-forest' : 'border-forest/10 bg-white text-forest/65 hover:border-nuraa/35')}>
                      <span className="text-2xl">{option.icon}</span>
                      <span className="mt-1 block text-xs font-semibold">{option.label}</span>
                    </button>
                  ))}
                </div>
                {errors.mood && <p className="mt-2 text-xs text-red-700">{errors.mood.message}</p>}
              </fieldset>
            )} />

            <div className="grid gap-4 md:grid-cols-2">
              {scaleFields.map(({ name, label, icon: Icon, low, high }) => (
                <Controller key={name} control={control} name={name} render={({ field }) => (
                  <fieldset className="rounded-3xl border border-forest/10 bg-canvas p-4">
                    <legend className="flex items-center gap-2 text-sm font-bold text-forest"><Icon size={17} className="text-nuraa" /> {label}</legend>
                    <div className="mt-4 grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${label} ${value} out of 5`} aria-pressed={field.value === value} onClick={() => field.onChange(value)} className={cn('grid size-10 place-items-center rounded-xl border text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nuraa/25', field.value === value ? 'border-nuraa bg-nuraa text-white' : 'border-forest/10 bg-white text-forest/60 hover:border-nuraa/30')}>{value}</button>)}
                    </div>
                    <div className="mt-2 flex justify-between text-[11px] font-semibold text-ink/45"><span>{low}</span><span>{high}</span></div>
                  </fieldset>
                )} />
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-forest">Sleep hours</span>
                <input type="number" step="0.25" className="h-12 w-full rounded-2xl border border-forest/15 bg-white px-4 text-sm text-ink outline-none focus:border-nuraa focus:ring-2 focus:ring-nuraa/15" {...register('sleepHours')} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-forest">Reflection</span>
                <textarea rows={3} className="w-full resize-none rounded-2xl border border-forest/15 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-nuraa focus:ring-2 focus:ring-nuraa/15" placeholder="Anything Nuraa should remember from today?" {...register('reflection')} onChange={(event) => setDraftNotes(event.target.value)} />
                <span className="mt-1 block text-right text-xs text-ink/45">{watch('reflection')?.length ?? 0}/300</span>
              </label>
            </div>

            {mutation.isError && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">{mutation.error instanceof Error ? mutation.error.message : 'Unable to save check-in.'}</p>}
            {mutation.isSuccess && <p role="status" className="rounded-2xl bg-sage p-3 text-sm font-semibold text-forest"><Sparkles size={16} className="mr-1 inline text-nuraa" /> Check-in saved. Taking you back to your dashboard.</p>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" size="lg" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save check-in'}</Button>
              <Button asChild variant="outline" size="lg"><Link to="/app/dashboard">Back to dashboard</Link></Button>
            </div>
          </form>
        </Card>
      </div>

      <Modal open={mutation.isSuccess} title="Check-in saved" onClose={() => navigate('/app/dashboard', { replace: true })}>
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-sage text-nuraa"><Sparkles size={24} /></div>
          <p className="mt-5 text-base leading-7 text-ink/75">Your health signal has been captured. Nuraa is updating your dashboard.</p>
          <p className="mt-2 text-sm leading-6 text-ink/58">Small daily signals create better guidance over time.</p>
          <Button className="mt-6 w-full" onClick={() => navigate('/app/dashboard', { replace: true })}>View dashboard</Button>
        </div>
      </Modal>
    </div>
  )
}
