import { render, screen } from '@testing-library/react'
import RunBuildSummary from '../components/adventure/RunBuildSummary'

describe('RunBuildSummary', () => {
  it('renders readable chinese copy for empty build sections', () => {
    render(
      <RunBuildSummary tacticalPreset="balanced" blessings={[]} relics={[]} branchTags={[]} routeDirections={[]} />
    )

    expect(screen.getByText('本次构筑')).toBeInTheDocument()
    expect(screen.getByText('战术: 平衡')).toBeInTheDocument()
    expect(screen.getByText('祝福')).toBeInTheDocument()
    expect(screen.getByText('尚未获得祝福')).toBeInTheDocument()
    expect(screen.getByText('遗物')).toBeInTheDocument()
    expect(screen.getByText('尚未获得遗物')).toBeInTheDocument()
  })
})
