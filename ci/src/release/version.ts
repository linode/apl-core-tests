import semver from 'semver'

const VERSION_RE = /^\d+\.\d+\.\d+(-rc\.\d+)?$/
const MINOR_VERSION_RE = /^v\d+\.\d+$/

export interface ReleaseSeries {
  major: number
  minor: number
}

export function releaseSeriesFromBranch(branchName: string, branchPrefix: string): ReleaseSeries {
  if (!branchName.startsWith(branchPrefix)) {
    throw new Error(`Invalid release branch name: ${branchName}`)
  }

  const match = /^v(\d+)\.(\d+)$/.exec(branchName.slice(branchPrefix.length))
  if (!match) throw new Error(`Invalid release branch name: ${branchName}`)

  return { major: Number(match[1]), minor: Number(match[2]) }
}

export function validateVersion(version: string): boolean {
  return VERSION_RE.test(version)
}

export function validateMinorVersion(minorVersion: string): boolean {
  return MINOR_VERSION_RE.test(minorVersion)
}

export function cycleStartVersion(minorVersion: string): string {
  return `${minorVersion}.0-rc.1`
}

export function releaseBranchName(version: string): string {
  const [major, minor] = version.split('.')
  return `releases/v${major}.${minor}`
}

export function incrementRc(version: string): string {
  const [base, pre] = version.split('-rc.')
  return `${base}-rc.${parseInt(pre, 10) + 1}`
}

export function promoteToStable(version: string): string {
  return version.replace(/-rc\.\d+$/, '')
}

export function nextPatchRc(version: string): string {
  const [major, minor, patch] = version.split('.').map(Number)
  return `${major}.${minor}.${patch + 1}-rc.1`
}

export function versionMatchesBranch(version: string, branch: string): boolean {
  return releaseBranchName(version) === branch
}

function filterSemver(tags: string[]): string[] {
  return tags.filter((t) => semver.valid(t))
}

export function previousStableTag(tags: string[]): string | null {
  const stable = filterSemver(tags)
    .filter((t) => !t.includes('-rc.'))
    .sort((a, b) => semver.rcompare(a, b))
  return stable.length >= 2 ? stable[1] : null
}

export function previousStableTagBefore(newTag: string, tags: string[]): string | null {
  const stable = filterSemver(tags)
    .filter((t) => !t.includes('-rc.'))
    .filter((t) => semver.lt(t, newTag))
    .sort((a, b) => semver.rcompare(a, b))
  return stable.length > 0 ? stable[0] : null
}

export function previousRcTag(currentTag: string, tags: string[]): string | null {
  const currentVersion = semver.parse(currentTag)
  if (!currentVersion) return null

  const sameSeries = filterSemver(tags)
    .filter((t) => t !== currentTag)
    .filter((t) => t.includes('-rc.'))
    .filter((t) => {
      const parsed = semver.parse(t)
      return parsed?.major === currentVersion.major && parsed?.minor === currentVersion.minor
    })
    .sort((a, b) => semver.rcompare(a, b))
  return sameSeries.length > 0 ? sameSeries[0] : null
}

function tagsForReleaseSeries(tags: string[], releaseSeries: ReleaseSeries): string[] {
  return filterSemver(tags).filter((tag) => {
    const parsed = semver.parse(tag)
    return parsed?.major === releaseSeries.major && parsed?.minor === releaseSeries.minor
  })
}

export function computeStableTag(branchTags: string[], releaseSeries: ReleaseSeries, tagPrefix: string): string {
  const rcs = tagsForReleaseSeries(branchTags, releaseSeries)
    .filter((t) => t.includes('-rc.'))
    .sort((a, b) => semver.rcompare(a, b))
  if (rcs.length === 0) throw new Error('No RC tags on branch — cannot promote to stable without a prior RC')
  const version = semver.coerce(rcs[0])?.toString() // ensure the tag is a valid semver version
  return `${tagPrefix}${version}`
}

export function computeNextRcTag(branchTags: string[], releaseSeries: ReleaseSeries, tagPrefix: string): string {
  const { major, minor } = releaseSeries
  const versions = tagsForReleaseSeries(branchTags, releaseSeries)
    .map((tag) => semver.parse(tag))
    .filter((version): version is semver.SemVer => version !== null)

  const highestStablePatch = versions
    .filter((version) => version.prerelease.length === 0)
    .reduce((highest, version) => Math.max(highest, version.patch), -1)

    // If there are no stable tags, we start at patch 0. If there are stable tags, we increment the highest patch by 1 for the next RC.
  const targetPatch = highestStablePatch + 1

  const highestRc = versions
    .filter((version) =>
      version.patch === targetPatch &&
      version.prerelease[0] === 'rc' &&
      typeof version.prerelease[1] === 'number'
    )
    .reduce((highest, version) => Math.max(highest, version.prerelease[1] as number), 0)
  // If there are no RC tags for the target patch, we start at rc.1. 
  // If there are existing RC tags, we increment the highest RC number by 1 for the next RC.
  const targetRcNumber = highestRc + 1
  return `${tagPrefix}${major}.${minor}.${targetPatch}-rc.${targetRcNumber}`
}

export function computeDevVersion(highestTag: string, shortSha: string): string {
  const version = semver.coerce(highestTag)
  if (!version) throw new Error(`Invalid highest tag: ${highestTag}`)
  return `${version.major}.${version.minor}.${version.patch + 1}-dev.${shortSha}`
}

export function highestTag(tags: string[]): string | null {
  const valid = tags.filter((t) => semver.valid(t)).sort((a, b) => semver.rcompare(a, b))
  return valid.length > 0 ? valid[0] : null
}

export function highestStableTag(tags: string[]): string | null {
  const stable = filterSemver(tags).filter((t) => !t.includes('-rc.')).sort((a, b) => semver.rcompare(a, b))
  return stable.length > 0 ? stable[0] : null
}

export function isHighestStableTag(newTag: string, existingTags: string[]): boolean {
  const stableTags = filterSemver(existingTags).filter((t) => !t.includes('-rc.'))
  return stableTags.every((t) => semver.gt(newTag, t))
}

export function computeReleaseBranchName(tag: string, bumpType: 'minor' | 'major', branchPrefix = 'releases/'): string {
  const version = semver.parse(tag)
  if (!version) throw new Error(`Invalid tag: ${tag}`)

  const [newMajor, newMinor] = bumpType === 'major'
    ? [version.major + 1, 0]
    : [version.major, version.minor + 1]
  return `${branchPrefix}v${newMajor}.${newMinor}`
}
