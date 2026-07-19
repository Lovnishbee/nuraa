import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { MealCard } from './MealCard'
import { WorkoutCard } from './WorkoutCard'

describe('dashboard meal and workout cards', () => {
  it('keeps the meal logging action visible in the empty state', () => {
    render(
      <MemoryRouter>
        <MealCard status="empty" summary={{ mealsLogged: 0, calories: 0, proteinG: 0 }} />
      </MemoryRouter>,
    )

    expect(screen.getByText(/meal insights unlock/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /log meal/i })).toHaveAttribute('href', '/app/meals')
  })

  it('keeps the workout logging action visible in the empty state', () => {
    render(
      <MemoryRouter>
        <WorkoutCard status="empty" summary={{ sessions: 0, minutes: 0, caloriesBurned: 0 }} />
      </MemoryRouter>,
    )

    expect(screen.getByText(/movement rhythm is still forming/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /log workout/i })).toHaveAttribute('href', '/app/workout')
  })
})
