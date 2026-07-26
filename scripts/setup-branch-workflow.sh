#!/usr/bin/env bash
# One-shot bootstrap for the dev/main branch workflow. Idempotent — safe to re-run.
# Requires: gh CLI authenticated with admin permission on the repository.
set -euo pipefail

REPO="real-case/sigil"
RULESET_NAME="main release gate"

# Fail fast: admin permission + merge commits enabled (the ruleset's
# merge-commit-only rule depends on the repo-level setting staying on).
if [[ "$(gh api "repos/${REPO}" --jq .permissions.admin)" != "true" ]]; then
  echo "setup-branch-workflow: gh is not authenticated with admin on ${REPO}" >&2
  exit 1
fi
if [[ "$(gh api "repos/${REPO}" --jq .allow_merge_commit)" != "true" ]]; then
  echo "setup-branch-workflow: merge commits are disabled on ${REPO}; the main ruleset requires them for release PRs" >&2
  exit 1
fi

# Open PRs keep their base branch when the default changes — warn so they get retargeted.
open_prs="$(gh pr list -R "${REPO}" --state open --json number --jq length)"
if [[ "${open_prs}" != "0" ]]; then
  echo "setup-branch-workflow: WARNING — ${open_prs} open PR(s) will keep their current base branch; retarget manually if needed" >&2
fi

git fetch origin main

# Create dev at origin/main's SHA (skip if it already exists).
if gh api "repos/${REPO}/git/ref/heads/dev" >/dev/null 2>&1; then
  echo "setup-branch-workflow: branch dev already exists — skipping creation"
else
  gh api "repos/${REPO}/git/refs" -f ref=refs/heads/dev -f sha="$(git rev-parse origin/main)" >/dev/null
  echo "setup-branch-workflow: created dev at $(git rev-parse --short origin/main)"
fi

# Flip the default branch.
if [[ "$(gh api "repos/${REPO}" --jq .default_branch)" == "dev" ]]; then
  echo "setup-branch-workflow: default branch is already dev"
else
  gh api -X PATCH "repos/${REPO}" -f default_branch=dev >/dev/null
  echo "setup-branch-workflow: default branch set to dev"
fi

# Create the main ruleset (skip if one with this name exists).
# Capture before grep -q: early pipe close + pipefail would misread the check.
existing_rulesets="$(gh api "repos/${REPO}/rulesets" --jq '.[].name')"
if grep -qxF "${RULESET_NAME}" <<<"${existing_rulesets}"; then
  echo "setup-branch-workflow: ruleset '${RULESET_NAME}' already exists — skipping"
else
  gh api -X POST "repos/${REPO}/rulesets" --input - <<'JSON' >/dev/null
{
  "name": "main release gate",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": { "include": ["refs/heads/main"], "exclude": [] }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["merge"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [{ "context": "verify" }]
      }
    }
  ]
}
JSON
  echo "setup-branch-workflow: ruleset '${RULESET_NAME}' created"
fi

echo "setup-branch-workflow: done"
