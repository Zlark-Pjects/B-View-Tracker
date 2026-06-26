---
name: bcryptjs vs bcrypt
description: Use bcryptjs (pure JS) not bcrypt (native) in this Replit environment
---

The native `bcrypt` package requires node-gyp and native compilation which fails in the Replit sandbox. Use `bcryptjs` instead — it's pure JavaScript and has an identical API.

**Why:** Replit's NixOS environment doesn't support arbitrary native addon builds reliably.

**How to apply:** Replace `import bcrypt from 'bcrypt'` with `import bcrypt from 'bcryptjs'`. The API (hash, compare, etc.) is identical.
