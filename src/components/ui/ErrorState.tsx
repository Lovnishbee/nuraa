import { AlertCircle } from 'lucide-react'
import { Button } from './button'

export function ErrorState({ title = 'Unable to load this section', description = 'Please try again in a moment.', onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-3xl border border-red-100 bg-red-50 p-5 text-center text-red-900">
      <AlertCircle className="mx-auto" size={24} />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-red-800/75">{description}</p>
      {onRetry && <Button type="button" onClick={onRetry} variant="secondary" size="sm" className="mt-4">Try again</Button>}
    </div>
  )
}
