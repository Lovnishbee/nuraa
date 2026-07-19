import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  it('exposes the pricing section through both navigation surfaces', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'Nuraa Free' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nuraa Coach' })).toBeInTheDocument()
    const pricingLinks = screen.getAllByRole('link', { name: 'Pricing' })
    expect(pricingLinks).toHaveLength(2)
    pricingLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '#pricing')
    })
  })
})
