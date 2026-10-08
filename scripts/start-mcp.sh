#!/bin/sh
# Entry point for the `youtube` server in .mcp.json: builds first if needed.
set -eu

cd "$(dirname "$0")/.."
sh scripts/ensure-built.sh
exec node dist/index.js
