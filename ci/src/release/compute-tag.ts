import { execSync } from 'child_process'
import { config } from 'dotenv'
import { appendFileSync } from 'fs'
import { computeNextRcTag, computeStableTag, releaseSeriesFromBranch, ReleaseSeries } from './version'

export function computeTag(
  branchTags: string[],
  releaseSeries: ReleaseSeries,
  promote: boolean,
  tagPrefix: string
): string {
  return promote
    ? computeStableTag(branchTags, releaseSeries, tagPrefix)
    : computeNextRcTag(branchTags, releaseSeries, tagPrefix)
}

function main() {
  const promote = process.env.IS_PRERELEASE !== 'true'
  const branchName = process.env.RELEASE_BRANCH!
  const branchPrefix = process.env.RELEASE_BRANCH_PREFIX!
  const tagPrefix = process.env.RELEASE_TAG_PREFIX ?? ''

  const tagsRaw = execSync('git tag --merged HEAD', { encoding: 'utf8' })
  const branchTags = tagsRaw.trim().split('\n').filter(Boolean)
  const releaseSeries = releaseSeriesFromBranch(branchName, branchPrefix)

  const tag = computeTag(branchTags, releaseSeries, promote, tagPrefix)
  console.log(`Computed tag: ${tag}`)

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\n`)
  }
}

if (require.main === module) {
  config()
  main()
}
