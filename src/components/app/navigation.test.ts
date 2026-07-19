import { describe, expect, it } from 'vitest'
import { appNavigationItems } from './navigation'

describe('appNavigationItems', () => {
  it('keeps all required destinations available to mobile navigation', () => {
    const mobileLabels = appNavigationItems
      .filter((item) => !('mobileHidden' in item && item.mobileHidden))
      .map((item) => item.label)

    expect(mobileLabels).toEqual([
      'Home',
      'Check-In',
      'Meals',
      'Workout',
      'Coach',
      'Progress',
      'Reports',
      'Profile',
    ])
  })
})
