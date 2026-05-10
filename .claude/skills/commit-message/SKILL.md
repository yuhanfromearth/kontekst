---
name: commit-message
description: Output a Conventional Commits / semver-conformant commit message for the current changes. Do not commit.
---

Inspect `git diff --staged` (fall back to `git diff`) and output a Conventional Commits message: `type(scope)?: subject`. Use `!` or `BREAKING CHANGE:` footer for breaking changes. Imperative, lowercase, ≤72 chars. Output only the message in a code block.
