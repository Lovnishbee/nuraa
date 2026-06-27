export type WidgetStatus = 'loading' | 'empty' | 'error' | 'populated'

export type StatefulWidgetProps = {
  status?: WidgetStatus
  onRetry?: () => void
}
