import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StatusBadge from '../components/common/StatusBadge'

describe('StatusBadge', () => {
  it('renders recovering disciples with the recovery label', () => {
    render(<StatusBadge status="recovering" />)

    expect(screen.getByText('恢复中')).toBeInTheDocument()
  })
})
