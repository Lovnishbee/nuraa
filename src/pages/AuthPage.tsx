import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import authIllustration from '@/assets/auth-illustration.png'
import { Brand } from '@/components/Brand'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getPostAuthDestination, getStoredOnboardingResumePath } from '@/features/onboarding/progress'
import { isSupabaseConfigured } from '@/lib/supabase'
import { loginWithEmail, registerWithEmail } from '@/services/auth'
import { getProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'

function createAuthSchema(isRegister: boolean) {
  return z.object({
    fullName: z.string().trim().optional(),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Use at least 8 characters'),
    confirmPassword: z.string().optional(),
  }).superRefine((data, context) => {
    if (isRegister && (!data.fullName || data.fullName.length < 2)) {
      context.addIssue({ code: 'custom', message: 'Enter your full name', path: ['fullName'] })
    }
    if (isRegister && data.password !== data.confirmPassword) {
      context.addIssue({ code: 'custom', message: 'Passwords do not match', path: ['confirmPassword'] })
    }
  })
}

type AuthValues = z.infer<ReturnType<typeof createAuthSchema>>

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const register = mode === 'register'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register: field, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthValues>({
    resolver: zodResolver(createAuthSchema(register)),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })

  async function onSubmit(values: AuthValues) {
    setError(null)
    if (!isSupabaseConfigured) {
      setError('Add your Supabase URL and publishable key to .env.local to enable authentication.')
      return
    }
    const result = register
      ? await registerWithEmail(values.fullName ?? '', values.email, values.password)
      : await loginWithEmail(values.email, values.password)
    if (result.error) { setError(result.error.message); return }
    if (register && !result.data.session) {
      navigate('/login', { state: { message: 'Check your email to confirm your account, then sign in.' } })
      return
    }

    const user = result.data.session?.user ?? result.data.user
    if (!user) {
      setError('We could not start your secure session. Please try signing in again.')
      return
    }

    setUser(user)

    if (register) {
      navigate('/onboarding/basic-details', { replace: true })
      return
    }

    try {
      const profileBundle = await getProfileBundle(user.id)
      queryClient.setQueryData(['profile', user.id], profileBundle)
      navigate(getPostAuthDestination(profileBundle, getStoredOnboardingResumePath(user.id)), { replace: true })
    } catch {
      navigate('/app/dashboard', { replace: true })
    }
  }

  return <div className="mx-auto grid min-h-screen max-w-360 items-center gap-10 px-5 py-6 md:grid-cols-[.9fr_1.1fr] md:px-10">
    <section className="glass-panel hidden self-stretch rounded-[36px] p-10 md:flex md:flex-col">
      <Brand />
      <div className="relative my-auto">
        <p className="text-xs font-bold tracking-[.14em] text-nuraa">A CALMER HEALTH ROUTINE</p>
        <h1 className="display mt-5 max-w-md text-5xl leading-[.95] text-forest">{register ? 'Your health journey starts here.' : 'Welcome back to your health rhythm.'}</h1>
        <p className="mt-6 max-w-sm leading-7 text-ink/65">{register ? 'Create your personal health foundation in a few focused steps.' : 'Continue building a clearer picture of what your body needs.'}</p>
        <div className="relative mt-8 h-85 overflow-hidden"><img src={authIllustration} alt="Nuraa mobile app with wellness devices" className="absolute left-1/2 top-0 w-[440px] max-w-none -translate-x-1/2" /></div>
      </div>
      <p className="text-xs leading-5 text-forest/60">Your information is private and used only for your Nuraa experience.</p>
    </section>
    <section className="mx-auto w-full max-w-md">
      <div className="glass-header mb-10 flex items-center justify-between px-4 py-3 md:hidden"><Brand compact /><Link className="text-sm font-semibold text-nuraa" to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Sign up'}</Link></div>
      <Card className="glass-surface p-6 sm:p-8">
        <p className="relative text-xs font-bold tracking-[.14em] text-nuraa">{register ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</p>
        <h2 className="display relative mt-3 text-4xl text-forest">{register ? 'Create your account' : 'Login'}</h2>
        <p className="relative mt-2 text-sm text-ink/65">{register ? 'Let’s get your health foundation started.' : 'Enter your details to continue with Nuraa.'}</p>
        {!isSupabaseConfigured && <p className="relative mt-5 rounded-2xl bg-sand/50 p-3 text-xs leading-5 text-forest">Demo UI is ready. Add the publishable Supabase environment variables to enable secure email/password auth.</p>}
        <form className="relative mt-7 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {register && <Field label="Full name" icon={UserRound} error={errors.fullName?.message}><Input placeholder="Enter your full name" autoComplete="name" {...field('fullName')} /></Field>}
          <Field label="Email" icon={Mail} error={errors.email?.message}><Input type="email" placeholder="you@example.com" autoComplete="email" {...field('email')} /></Field>
          <Field label="Password" icon={LockKeyhole} error={errors.password?.message}><div className="relative"><Input type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" autoComplete={register ? 'new-password' : 'current-password'} className="pr-12" {...field('password')} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3 text-forest/55" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field>
          {register && <Field label="Confirm password" icon={LockKeyhole} error={errors.confirmPassword?.message}><Input type={showPassword ? 'text' : 'password'} placeholder="Confirm your password" autoComplete="new-password" {...field('confirmPassword')} /></Field>}
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <Button className="mt-2 w-full" size="lg" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : register ? 'Create account' : 'Login'}</Button>
        </form>
        <p className="relative mt-6 text-center text-sm text-ink/60">{register ? 'Already have an account?' : 'New to Nuraa?'} <Link className="font-semibold text-nuraa" to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p>
      </Card>
    </section>
  </div>
}

function Field({ label, icon: Icon, error, children }: { label: string; icon: typeof Mail; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-semibold text-forest"><Icon size={15} className="text-nuraa" />{label}</span>{children}{error && <span className="mt-1.5 block text-xs text-red-700">{error}</span>}</label>
}
