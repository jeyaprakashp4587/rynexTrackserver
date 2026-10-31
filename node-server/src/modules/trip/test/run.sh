#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/test/harness/src/modules/trip"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$ROOT/src/modules/trip/." "$DEST/"
cd "$ROOT"
node --experimental-test-module-mocks --test "$@"
