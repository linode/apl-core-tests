import { appendFileSync } from 'fs'
import { execSync } from 'child_process'
import { config } from 'dotenv'
import { computeReleaseBranchName, highestStableTag, highestTag } from './version'

function main() {
  const bumpType = process.env.BUMP_TYPE as 'minor' | 'major'
  const branchPrefix = process.env.RELEASE_BRANCH_PREFIX!

  if (bumpType !== 'minor' && bumpType !== 'major') {
    console.error(`Invalid BUMP_TYPE: "${bumpType}". Must be "minor" or "major".`)
    process.exit(1)
  }

  const tagsRaw = execSync('git tag', { encoding: 'utf8' })
  const tags = tagsRaw.trim().split('\n').filter(Boolean)
  const highest = highestTag(tags)

  if (!highest) {
    console.error('No stable tags found in repository — cannot derive release branch name.')
    process.exit(1)
  }

  const branch = computeReleaseBranchName(highest, bumpType, branchPrefix)
  console.log(`Highest stable tag: ${highest}`)
  console.log(`Derived release branch: ${branch}`)

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `branch=${branch}\n`)
  }
  if (process.env.GITHUB_ENV) {
    appendFileSync(process.env.GITHUB_ENV, `RELEASE_BRANCH=${branch}\n`)
  }
}

if (require.main === module) {
  config()
  main()
}
