---
name: API server PORT default
description: B-View API server uses PORT=8080 default; stale processes block workflow restart
---

The API server defaults to port 8080 (`${PORT:-8080}` in the dev script). When configureWorkflow fails with EADDRINUSE, it's usually a stale process from a previous session still holding the port. Fix: `lsof -i :8080 | awk 'NR>1 {print $2}' | xargs kill -9` then retry configureWorkflow.

**Why:** The workflow system doesn't always SIGKILL previous instances fast enough before spawning a new one.

**How to apply:** If workflow restart fails with EADDRINUSE, manually kill PIDs on the port first.
