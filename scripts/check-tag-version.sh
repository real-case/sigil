#!/usr/bin/env bash
# Release guard: the pushed tag must match the version in package.json.
# Usage: GITHUB_REF_NAME=vX.Y.Z scripts/check-tag-version.sh
set -euo pipefail

if [[ -z "${GITHUB_REF_NAME:-}" ]]; then
  echo "check-tag-version: GITHUB_REF_NAME is not set" >&2
  exit 1
fi

pkg_version="$(node -p "require('./package.json').version")"
expected="v${pkg_version}"

if [[ "${GITHUB_REF_NAME}" != "${expected}" ]]; then
  echo "check-tag-version: tag '${GITHUB_REF_NAME}' does not match package.json version '${pkg_version}' (expected '${expected}')" >&2
  exit 1
fi

echo "check-tag-version: tag '${GITHUB_REF_NAME}' matches package.json (${pkg_version})"
