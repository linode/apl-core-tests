import { computeTag } from './compute-tag'
import { releaseSeriesFromBranch } from './version'

describe('computeTag', () => {
  const releaseSeries = { major: 6, minor: 1 }

  it('returns next RC when branch has existing RC tags', () => {
    expect(computeTag(['v6.1.0-rc.2', 'v6.1.0-rc.1'], releaseSeries, false)).toBe('v6.1.0-rc.3')
  })

  it('starts at rc.1 from branch name when no tags on branch', () => {
    expect(computeTag([], releaseSeries, false)).toBe('v6.1.0-rc.1')
  })

  it('uses the configured release branch prefix', () => {
    const customSeries = releaseSeriesFromBranch('release/v6.1', 'release/')
    expect(computeTag([], customSeries, false)).toBe('v6.1.0-rc.1')
  })

  it('promotes highest RC to stable', () => {
    expect(computeTag(['v6.1.0-rc.3', 'v6.1.0-rc.2'], releaseSeries, true)).toBe('v6.1.0')
  })

  it('ignores RC tags from other release series when promoting', () => {
    expect(computeTag(['v7.0.0-rc.1', 'v6.1.0-rc.3'], releaseSeries, true)).toBe('v6.1.0')
  })

  it('throws when promoting to stable with no RC tags', () => {
    expect(() => computeTag([], releaseSeries, true)).toThrow()
  })
})
