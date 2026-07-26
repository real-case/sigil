---
slug: dev-main-branch-workflow
type: feature
status: in-progress
created: 2026-07-25
tracker: none
supersedes: none
stack: typescript, github-actions, shell
risk: medium
breaking: false
spike_required: false
test_command: npm test
contract_sha: 85f7a3feb78c3568
---

# Adopt dev/main Branch Workflow with Tag-Driven npm Release

## Goal
Move the repository from trunk-on-main to a two-branch workflow: `dev` becomes the integration branch (GitHub default — all feature and dependabot PRs land there), `main` becomes release-only. A release is a `dev` → `main` PR followed by a manually pushed `vX.Y.Z` tag on main; the tag triggers CI to publish `@real-case/sigil` to npm via Trusted Publishing (OIDC, no long-lived token) and create a GitHub Release. The release path is enforced end-to-end: the tagged commit must be reachable from `main`, and `main` itself only moves via PR with green CI. The pipeline is shaped so a site-deploy job for sigil.live can be added later without restructuring.

## Context
- Related patterns: `.github/dependabot.yml` already covers npm + github-actions ecosystems and follows the repository default branch — no functional change needed; it retargets to `dev` automatically once the default flips, and its github-actions ecosystem will start maintaining the new workflow files (only its stale "no workflows yet" comment needs a touch-up, F7). Conventional-commit style (`feat:`, `fix:`, `chore:`) is already in use per `git log`.
- Callers / reverse-deps: none in code. Operational consumers: dependabot (targets default branch); local clones (need `git remote set-head origin -a` after the flip); npm consumers of `@real-case/sigil` (registry has 0.1.0, package.json is at 0.2.0 — unaffected until the first tag push).
- Constraints: no CI exists today (`.github/workflows/` is absent — only `dependabot.yml`); repo is public (rulesets available on the free plan); solo maintainer, so the ruleset must require a PR but 0 approving reviews (GitHub forbids approving your own PR); npm OIDC Trusted Publishing requires npm CLI ≥ 11.5.1 on the runner (Node 22 bundles npm 10 — the release job upgrades npm); `prepublishOnly` in package.json already rebuilds `dist/` before any publish; the maintainer's current habit includes direct pushes to main (last five commits are non-merge), which the new ruleset deliberately blocks.
- Sibling specs: none — `.marvin/task/` holds no specs yet; this is the first. The repo's `specs/` directory holds design briefs (design system, website), not task specs; `specs/website-brief.md` describes the future sigil.live site this pipeline must leave room for.

## Spec Contract
The authoritative, machine-validated contract (the `spec` DoR gate parses and schema-checks this block). The implementer/executor may touch **only** the files listed in `files`; each criterion is implemented by exactly its `implemented_by` rows and proven by its `oracle`.

```yaml spec-contract
files:
  - id: F1
    path: .github/workflows/ci.yml
    action: new
    intent: CI gate — a single job named `verify` (npm ci → typecheck → vitest → build) on pull_request to dev/main, push to dev/main, and workflow_dispatch; Node 22 with npm cache; permissions contents:read
    satisfies: [AC1]
  - id: F2
    path: scripts/check-tag-version.sh
    action: new
    intent: release guard — exits non-zero unless $GITHUB_REF_NAME equals "v" + package.json version; called by release.yml and testable locally
    satisfies: [AC4]
  - id: F3
    path: .github/workflows/release.yml
    action: new
    intent: tag-driven release — on push of tags v*; permissions contents:write + id-token:write; checkout with fetch-depth 0; upgrades npm to ≥ 11.5.1; runs the version guard AND an ancestry assertion (tagged commit reachable from origin/main) BEFORE npm ci, typecheck, tests, idempotent `npm publish` via OIDC Trusted Publishing (skip if version already on registry) and idempotent `gh release create --generate-notes`
    satisfies: [AC5, AC6]
  - id: F4
    path: scripts/setup-branch-workflow.sh
    action: new
    intent: idempotent one-shot bootstrap via gh CLI — fail fast unless gh auth has admin on the repo; warn about open PRs; create dev from origin/main SHA (gh api git/refs); set default branch to dev; create ruleset "main release gate" with fully pinned parameters (PR required with 0 approvals + merge-commit-only, required status check `verify`, block force-push and deletion, no bypass actors)
    satisfies: [AC2, AC3]
  - id: F5
    path: README.md
    action: edit
    intent: document the branch & release workflow in the Development section — daily flow on dev, release procedure (dev→main PR merged with a merge commit + tag on main), hotfix path, note for existing clones
    satisfies: [AC7]
    anchor: README.md:256
  - id: F6
    path: CLAUDE.md
    action: edit
    intent: add a "### Branch & release workflow" subsection under "## Rules" (after "### Other conventions", before "## Useful commands") so Claude Code targets dev for PRs, never commits to main directly, and knows the tag-driven release procedure
    satisfies: [AC7]
    anchor: CLAUDE.md:28
  - id: F7
    path: .github/dependabot.yml
    action: edit
    intent: update the stale "no workflows yet — block is a no-op" comment on the github-actions block, which F1/F3 make false; no functional change
    satisfies: "—"
    anchor: .github/dependabot.yml:29
build_order: [F1, F2, F3, F4, F5, F6, F7]
depends_on: []
contract:
  kind: cli
  signature: |
    scripts/setup-branch-workflow.sh                       # no args; requires gh CLI authenticated with repo admin; idempotent, safe to re-run
    GITHUB_REF_NAME=vX.Y.Z scripts/check-tag-version.sh    # exit 0 iff X.Y.Z equals package.json .version
criteria:
  - id: AC1
    statement: A pull request targeting dev (or main) runs the `verify` job — npm ci, typecheck, vitest, build — reported as a check named `verify`; the latest pull_request-event run of ci.yml for the delivery branch concludes "success"
    implemented_by: [F1]
    oracle:
      kind: command
      ref: >-
        gh run list --workflow=ci.yml --event pull_request
        --branch "$(git branch --show-current)" --limit 1
        --json conclusion --jq ".[0].conclusion" | grep -qx success
    failure: the PR shows no checks, verify is red on a green working tree, the run has not concluded yet, or the oracle is invoked off the delivery branch (capture it from the task branch before the PR merges)
  - id: AC2
    statement: Branch dev exists on origin (created from origin/main's SHA at bootstrap time) and is the GitHub default branch, so new PRs and dependabot target dev by default
    implemented_by: [F4]
    oracle:
      kind: command
      ref: gh api repos/real-case/sigil --jq .default_branch | grep -qx dev
    failure: default branch stays main; new PRs and dependabot keep targeting main
  - id: AC3
    statement: The active rules on main are exactly — deletion, non_fast_forward, pull_request with 0 required approvals and merge-commit as the only allowed merge method, and required_status_checks with context `verify`; direct pushes, force-pushes, squash-merges into main, and deletion are all blocked
    implemented_by: [F4]
    oracle:
      kind: command
      ref: >-
        gh api repos/real-case/sigil/rules/branches/main --jq
        '(([.[].type] | sort) == ["deletion","non_fast_forward","pull_request","required_status_checks"])
         and ([.[] | select(.type=="required_status_checks") | .parameters.required_status_checks[].context] == ["verify"])
         and ([.[] | select(.type=="pull_request") | .parameters.required_approving_review_count] == [0])
         and ([.[] | select(.type=="pull_request") | .parameters.allowed_merge_methods // [] | .[]] == ["merge"])'
        | grep -qx true
    failure: a direct `git push origin main` succeeds, a squash-merge diverges dev from main, or the required check context drifts from the CI job name
  - id: AC4
    statement: scripts/check-tag-version.sh exits non-zero when $GITHUB_REF_NAME mismatches "v" + package.json version, and zero when it matches — testable locally with no network
    implemented_by: [F2]
    oracle:
      kind: command
      ref: >-
        GITHUB_REF_NAME=v0.0.0 bash scripts/check-tag-version.sh && exit 1;
        GITHUB_REF_NAME="v$(node -p "require('./package.json').version")" bash scripts/check-tag-version.sh
    failure: a mistagged release publishes an npm version that differs from package.json
  - id: AC5
    statement: release.yml wires both guards ahead of publish inside a single job — checkout uses fetch-depth 0 (without it the ancestry guard fails closed on every tag), and both the check-tag-version.sh call and the `git merge-base --is-ancestor` assertion against origin/main appear before the `npm publish` step — so a tag on a commit not reachable from main, or mismatching package.json, fails before any publish attempt
    implemented_by: [F3]
    oracle:
      kind: command
      ref: >-
        awk '/fetch-depth: 0/{d=NR} /check-tag-version.sh/{g=NR} /merge-base --is-ancestor/{a=NR}
        /npm publish/{p=NR} END{exit !(d && g && a && p && g<p && a<p)}' .github/workflows/release.yml
        && [ "$(grep -c "runs-on:" .github/workflows/release.yml)" -eq 1 ]
    failure: a v* tag pushed from dev (or any non-main commit) publishes to npm, bypassing the main PR gate entirely
  - id: AC6
    statement: release.yml publishes via OIDC Trusted Publishing — id-token:write permission is set, no NPM_TOKEN/NODE_AUTH_TOKEN is referenced anywhere, and npm is upgraded to a trusted-publishing-capable version (npm@latest or npm@11+) before publish
    implemented_by: [F3]
    oracle:
      kind: command
      ref: >-
        grep -q "id-token: write" .github/workflows/release.yml &&
        ! grep -qE "NPM_TOKEN|NODE_AUTH_TOKEN" .github/workflows/release.yml &&
        grep -qE "npm@(latest|1[1-9]|[2-9][0-9])" .github/workflows/release.yml
    failure: publish depends on a long-lived npm token, or fails on the runner's bundled npm 10 with an OIDC error
  - id: AC7
    statement: README.md and CLAUDE.md describe the dev/main workflow in English — daily work lands in dev, release procedure (dev→main PR merged via merge commit, then tag push on main), hotfix path — and CLAUDE.md gains the branch rule as a new subsection under Rules
    implemented_by: [F5, F6]
    oracle:
      kind: prose-review
    failure: contributors (and Claude Code) keep opening PRs against main, or squash-merge a release PR and silently diverge the branches
```

## Host Bindings
Discovered from this repo, not assumed.

```yaml host-bindings
spec_location: .marvin/task/
decision_record:
  style: none
  path: none
merge_obligations:
  - all Markdown in this repository is written in English (CLAUDE.md documentation-language rule)
  - typecheck + tests + build green (npm run typecheck / npm test / npm run build)
gates:
  test: npm test
  typecheck: npm run typecheck
  build: npm run build
```

## Data & Config
- No code-level config, env vars, flags, or migrations.
- Repository settings changed by F4 (operational, reversible): default branch → `dev`; new ruleset "main release gate" on `main` with `bypass_actors: []` — break-glass is editing/disabling the ruleset itself via `gh api` (an owner right), not a bypass list.
- **External manual setup (owner-only, outside this repo):** on npmjs.com → package `@real-case/sigil` → Settings → Trusted Publisher: GitHub Actions, repository `real-case/sigil`, workflow `release.yml`, no environment. Required before the first tag push; until configured, a tag push fails at the publish step (both guards and checks still pass — harmless).
- Rollback: default-branch flip and ruleset are reversible via `gh api`; a bad tag can be deleted before publish; a published npm version cannot be re-published (only deprecated) — both guards + verify steps run before publish to make that rare. A partially completed release (published to npm, GitHub Release failed) is recovered by re-running the workflow: publish is skipped when the version already exists on the registry, and `gh release create` is skipped when the release already exists.

## Chosen Approach
Variant 3 from dialogue — manual tag + npm Trusted Publishing (OIDC):

1. **Bootstrap** (run `scripts/setup-branch-workflow.sh` once during implementation). The script, in order: (a) fail fast unless `gh api repos/real-case/sigil --jq .permissions.admin` is `true` and `gh api repos/real-case/sigil --jq .allow_merge_commit` is `true` (the ruleset's merge-commit-only rule depends on that repo-level setting staying enabled); (b) `git fetch origin main`; (c) list open PRs and print a retarget warning if any exist (open PRs do NOT retarget automatically on a default-branch change); (d) create `dev` at the **origin/main** SHA via `gh api repos/real-case/sigil/git/refs -f ref=refs/heads/dev -f sha=$(git rev-parse origin/main)` (skip if `dev` already exists); (e) `gh api -X PATCH repos/real-case/sigil -f default_branch=dev`; (f) create ruleset "main release gate" via `gh api repos/real-case/sigil/rulesets` (skip if a ruleset with that name exists) — target `refs/heads/main`, enforcement `active`, `bypass_actors: []`, rules: `deletion`; `non_fast_forward`; `pull_request` with `{required_approving_review_count: 0, dismiss_stale_reviews_on_push: false, require_code_owner_review: false, require_last_push_approval: false, required_review_thread_resolution: false, allowed_merge_methods: ["merge"]}`; `required_status_checks` with `{strict_required_status_checks_policy: false, required_status_checks: [{context: "verify"}]}`.
2. **ci.yml**: triggers `pull_request: branches: [dev, main]`, `push: branches: [dev, main]`, `workflow_dispatch`. One job `verify` on ubuntu-latest, Node 22 (`actions/setup-node` with `cache: npm`): `npm ci` → `npm run typecheck` → `npm test` → `npm run build`. `permissions: contents: read`.
3. **release.yml**: trigger `push: tags: ['v*']`. One job `release` on ubuntu-latest, `permissions: contents: write, id-token: write`. Steps: checkout with `fetch-depth: 0` → setup-node (Node 22, `registry-url: https://registry.npmjs.org`) → `npm install -g npm@latest` (OIDC needs npm ≥ 11.5.1; Node 22 bundles npm 10) → `bash scripts/check-tag-version.sh` → ancestry guard `git merge-base --is-ancestor "$GITHUB_SHA" origin/main` (fails the run for tags on commits not reachable from main) → `npm ci` → `npm run typecheck` → `npm test` → idempotent publish (`VERSION=$(node -p "require('./package.json').version")`; skip when `npm view "@real-case/sigil@$VERSION" version 2>/dev/null` prints anything — the stderr-tolerant form keeps a clean E404 from failing the step on the first publish of a version — else `npm publish`; OIDC Trusted Publishing, no `NODE_AUTH_TOKEN` env anywhere, `prepublishOnly` rebuilds dist, provenance attached automatically) → idempotent release (`gh release view "$GITHUB_REF_NAME" || gh release create "$GITHUB_REF_NAME" --generate-notes`, `GH_TOKEN: ${{ github.token }}`).
4. **Daily flow** (documented in F5/F6): feature branches off `dev` → PR → merge into `dev` (any merge method). **Release**: bump version in package.json on dev, PR `dev` → `main` — merge-commit only, enforced by the ruleset (`allowed_merge_methods: ["merge"]`), keeping dev an ancestor of main so routine releases need no back-merge — then `git tag vX.Y.Z && git push origin vX.Y.Z` on the merge commit. **Hotfix**: branch off `main` → PR to `main` → tag → PR `main` → `dev` to back-merge.
5. **Site later**: when sigil.live source lands (this repo or Vercel Git integration), production deploys track `main`; the release.yml job chain (guards → verify → publish → release) accepts an appended deploy job.

**Stack compliance:** NATIVE
**Future alignment:** N/A (no VISION.md)

**Stack extensions required:** none — only stock actions (`actions/checkout`, `actions/setup-node`), gh CLI, and npm itself.

## Why this over alternatives
- Variant 1 — NPM_TOKEN secret (rejected): identical flow but requires storing and rotating a long-lived npm automation token in repo secrets; OIDC gives the same manual-tag control tokenless, with provenance attached automatically.
- Variant 2 — release-please (rejected): the bot creates versions, changelogs, and tags itself, which contradicts the explicitly chosen manual tag control; adds an external action dependency and bot PRs to debug. Conventional commits already in use keep this door open if release cadence grows.

## Test Plan
- Harness: vitest via `npm test` (unchanged by this task — no new unit tests; deliverables are workflows + shell scripts).
- Proofs are the command oracles in the contract: AC4's guard script is testable locally before any push; AC5/AC6 are static assertions over release.yml (wiring order + OIDC config) — the end-to-end publish is deliberately NOT exercised by this task (see Non-goals); AC2/AC3 verify live repo state via `gh api` after the bootstrap script runs; AC1 resolves on the delivery PR itself (its base is `dev`, new workflow files do trigger on `pull_request` events for the PR that introduces them, and the oracle filters to `--event pull_request --branch <delivery branch>` so a post-merge push run cannot shadow it).
- Oracle convention: every command oracle is self-asserting via exit code (AC1/AC2/AC3 pipe their evidence through `grep -qx` / jq booleans; AC4/AC5/AC6 assert directly), so a mechanical runner keying on exit status gets honest results. AC1 must be captured from the delivery branch before the PR merges.
- Test locations / conventions: `src/__tests__/*.test.ts` untouched.

## Definition of Done
- [ ] `npm run typecheck`, `npm test`, `npm run build` green locally
- [ ] `scripts/setup-branch-workflow.sh` executed: AC2/AC3 oracle outputs captured in verification
- [ ] Delivery PR targets `dev`; `verify` check green on it (AC1 oracle output captured)
- [ ] README.md + CLAUDE.md updated in English (AC7); dependabot comment refreshed (F7); no other Markdown touched
- [ ] No version bump in this task (package.json stays 0.2.0); no npm publish performed
- [ ] Manual follow-up handed to the user: configure the npm Trusted Publisher, then cut v0.2.0 as the first tag-driven release

## Non-goals
- Building or deploying the sigil.live site (source lives outside this repo; the pipeline only leaves room for it)
- Publishing v0.2.0 or any npm release as part of this task — the first real tag push is the end-to-end validation, performed by the user after the Trusted Publisher is configured
- CHANGELOG automation, release-please, or changesets
- Protecting `dev` (stays unprotected for solo velocity)
- Cleaning up stale remote branches (`feat/map-widget`, `storybook-blueprint`, dependabot leftovers)
- Retargeting open PRs (none at authoring time; the bootstrap script re-checks and warns at run time)
- Storybook deployment (separately rejected earlier)

## Assumptions
- Solo maintainer: the main ruleset requires a PR but 0 approving reviews, since GitHub forbids self-approval; the gate is CI, not review.
- The gh CLI in the implementation environment is authenticated as a user with **admin** permission on real-case/sigil (required for the default-branch flip and ruleset creation); the bootstrap script fail-fasts on this before changing anything.
- The user (npm package owner) configures the Trusted Publisher on npmjs.com before the first tag push; until then a tag push fails only at the publish step.
- Node 22 on runners satisfies `engines: >=18`; local development on newer Node versions is unaffected.
- `strict_required_status_checks_policy` is `false`: release PRs go dev→main and dev always contains main (merge-commit-only releases), so the branch is up to date by construction and a forced rebase step would be dead weight.

## Open Questions
none

## Security / NFR
- Supply chain: OIDC Trusted Publishing removes the long-lived npm token entirely; provenance attestations are published automatically; workflows run with least-privilege permissions (ci: `contents: read`; release: `contents: write` + `id-token: write` only).
- The release path is enforced end-to-end: `main` only moves via PR with green `verify` (ruleset — no direct/force pushes, no deletion, no squash divergence), and release.yml refuses tags whose commit is not reachable from `origin/main` — so a `v*` tag pushed from `dev` or a stray branch cannot publish.
- New workflow files fall under the existing dependabot `github-actions` ecosystem, so action versions stay maintained.
- No auth, crypto, PII, or input-parsing code is touched. Rollback paths documented in Data & Config.

## Critic Verdict & Overrides
PASS WITH WARNINGS (round 2; round 1 was BLOCK). Round-1 blockers — guard-wiring oracle, ruleset-parameter proof, unenforced tag provenance, wrong-run selection in AC1 — all fixed and mechanically re-verified by the critic. Round-2 warnings folded into this revision: `fetch-depth: 0` and single-job assertions added to AC5's oracle; AC1/AC2/AC3 oracles made self-asserting (exit-code convention recorded in Test Plan); publish idempotence pinned (explicit VERSION derivation, stderr-tolerant `npm view`, no NODE_AUTH_TOKEN); bootstrap fail-fast extended with repo-level `allow_merge_commit`. Accepted without change: F7 remains the one row proven only by DoD review (a comment-only edit); AC1's oracle stays position-dependent by nature (mitigated by the capture-before-merge instruction).

## Design Notes
- `dependabot.yml` is functionally untouched (F7 only refreshes a stale comment): it follows the repository default branch, so after the flip its npm and github-actions PRs target `dev` automatically. Already-open dependabot PRs do not retarget — the bootstrap script warns if any exist; expect one burst of rebase churn on the first Monday run after the flip.
- The required status check is coupled to the CI job name `verify` — renaming that job requires updating the ruleset in the same change (AC3's oracle asserts the exact context, so drift is caught).
- Existing local clones after the default flip: `git fetch origin && git remote set-head origin -a`; README (F5) carries this note.
- `prepublishOnly` already runs `rm -rf dist && npm run build`, so the publish artifact is always freshly built even though the release job also runs checks — keep it; it protects manual publishes too.
- Break-glass on main: `bypass_actors` is deliberately empty; the owner's escape hatch is editing or temporarily disabling the ruleset via `gh api` (auditable), not a standing bypass.
- The Claude Code session footer may keep suggesting `main` as the PR base until a new session picks up the flipped default; the CLAUDE.md rule (F6) is what makes agents target `dev` regardless.
- The spec file itself (`.marvin/task/001-dev-main-branch-workflow.md`) is a Phase-1 artifact committed by the pipeline, not part of this implementation allowlist; scope checks (`spec` tool, `mode: scope`) should pass it via `allow`.
- risk is `medium`, not `low`, deliberately: code risk is trivial, but the change flips a public repo's default branch and installs a ruleset that blocks the maintainer's demonstrated direct-push-to-main habit. Both are reversible (documented above), but the first week of muscle memory will hit the guardrails.

## Future Considerations
- **Site**: when the sigil.live source lands (monorepo dir or Vercel Git integration), set Vercel's production branch to `main` (previews from `dev`), or append a deploy job to release.yml.
- **First pipeline release**: confirm 0.2.0 in package.json on dev, PR to main, tag `v0.2.0` — this also heals the npm registry staleness (still at 0.1.0) and is the true end-to-end test of release.yml.
- Optional later: release-please/changesets if cadence or contributor count grows; a Node version matrix (20/22/24) if runtime-support guarantees matter; CI + npm badges in README.
