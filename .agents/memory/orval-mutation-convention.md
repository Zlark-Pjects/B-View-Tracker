---
name: Orval mutation calling convention
description: How to call Orval-generated mutation hooks — body must be wrapped in { data: ... }
---

Orval generates mutation hooks where the mutate argument is `{ data: BodyType<T> }`, not `T` directly.

**Why:** Orval separates path params, query params, and body into named keys on the mutation variables object. The body always goes under `data`.

**How to apply:** When calling `mutation.mutate(...)`, always wrap the body: `mutation.mutate({ data: { field1, field2 } })`. For mutations with path params (e.g. update by id): `mutation.mutate({ id, data: { ... } })`.
