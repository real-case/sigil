---
id: admin-repo-operations-need-the-real
type: gotcha
title: Admin repo operations need the real-case gh account, not UrchinStriped
created: 2026-07-26
tags: gh, auth, admin, repo-settings
source: dev-main-branch-workflow
---

The local gh CLI has two authenticated accounts: UrchinStriped (active by default, push but admin:false on real-case/sigil) and real-case (owner, admin:true). Repo-settings mutations — rulesets, default-branch flips, repo PATCH — fail the admin check under UrchinStriped. Use `gh auth switch --user real-case`, run the operation, then switch back to UrchinStriped so pushes and PRs keep their usual identity.
