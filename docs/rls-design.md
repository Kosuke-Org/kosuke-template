# Row-level security: design, and why it is not shipped yet

Status: design only. No migration, no policy, no schema change.

I stopped before writing the migration. Two blockers make a policy set shipped today
inert rather than protective, and a policy that enforces nothing is worse than no
policy, because the migration file reads like protection.

## The short version

The mechanism is not the problem. I built the per-transaction identity mechanism
against this project's real driver and it works. The problems are that the app
connects to Postgres as a superuser, so no policy can ever apply to it, and that
Better Auth queries the org tables outside any transaction the app controls,
including during sign-in before an identity exists.

## Blocker 1: the app connects as a superuser

`POSTGRES_URL` resolves to the `postgres` role. Measured on the running database:

```
 current_user | rolsuper | rolbypassrls
--------------+----------+--------------
 postgres     | t        | t
```

Superusers and roles holding `BYPASSRLS` skip row security entirely. `FORCE ROW
LEVEL SECURITY` does not change this. `FORCE` only removes the _table owner's_
exemption. It has no effect on a superuser.

I confirmed it rather than trusting the docs. A table with RLS enabled, `FORCE` set,
and a policy that can only ever be false:

```sql
ALTER TABLE t ENABLE ROW LEVEL SECURITY;
ALTER TABLE t FORCE ROW LEVEL SECURITY;
CREATE POLICY p ON t USING (org = current_setting('app.org', true));
-- app.org is never set, so a policy that applies must return zero rows
```

| connecting role                | rows returned |
| ------------------------------ | ------------- |
| `postgres` (what the app uses) | 2 of 2        |
| a plain non-superuser role     | 0 of 2        |

So every policy in the scoped list would apply to nobody. `bun run db:migrate`
would succeed, the migration would sit in `lib/db/migrations/`, and the protection
would be zero.

Fixing this is not a code change. `kosuke.config.json` declares Postgres as a
platform storage with `"connection_variable": "POSTGRES_URL"`, so the platform
injects the connection string and its role. RLS needs two roles, an owner role that
runs DDL for `db:migrate` and a non-superuser application role that runs queries,
which means two connection strings threaded through `.env.example`,
`docker-compose.yml`, both CI jobs, `drizzle.config.ts`, the Render deploy, and the
platform's provisioning. That is an infrastructure change, and I cannot make it
truthfully from inside the repo.

## Blocker 2: Better Auth reads the org tables outside any transaction

`lib/auth/providers/index.ts` reads `organizations` joined to `org_memberships` in
the `session.create.before` hook. That runs during sign-in, before a session exists.
There is no user identity to put in a GUC at that moment, because establishing the
identity is what the query is for.

Those hooks call the shared `db` through `drizzleAdapter`. The app cannot wrap them
in its own transaction, and Better Auth's internal adapter queries for users and
sessions are equally out of reach.

With RLS on `organizations` and a non-superuser role, that query returns zero rows.
Every new session then gets `activeOrganizationId: null`. Users sign in and land
with no organization. It fails silently, as a data bug, not an error.

`lib/trpc/init.ts` has the same shape one level down. `orgProcedure` reads
`org_memberships` to decide whether the caller is a member. If `org_memberships`
carried a membership-keyed policy, reading membership would require membership.

## The mechanism, which does work

Worth stating clearly, because it is the part the brief asked to justify and it is
sound. A pooled connection is shared across requests, so a plain `SET app.user_id`
persists on the connection after the request ends and leaks into whoever gets that
connection next. `SET LOCAL` is scoped to the transaction and released with it.

`lib/db/drizzle.ts` uses `postgres-js`, where `sql.begin()` reserves a single
connection for the transaction, which is what makes `SET LOCAL` safe here. I ran it
against a real non-superuser role with the pool capped at one connection, so the
transaction and the query after it are guaranteed to share a connection:

```ts
const inTx = await app.begin(async (tx) => {
  await tx`SELECT set_config('app.org', 'A', true)`; // true = SET LOCAL
  return tx`SELECT id, org FROM t`;
});
// -> [{ id: 1, org: 'A' }]      policy filters correctly

await app`SELECT id, org FROM t`;
// -> []                          same connection, no leak

await app`SELECT current_setting('app.org', true)`;
// -> ''                          released with the transaction
```

Result: correct filtering inside, no leak after. The mechanism holds. It is
everything around it that is not ready.

## What the policies would look like

Recorded so the next attempt does not restart from nothing. The membership test is
the whole point. A policy that checks "is there a logged-in user" hands every
logged-in user the entire table.

```sql
CREATE POLICY tasks_org_isolation ON tasks
  USING (
    organization_id IN (
      SELECT organization_id FROM org_memberships
      WHERE user_id = current_setting('app.user_id', true)::uuid
    )
  );
```

Not `USING (current_setting('app.user_id', true) IS NOT NULL)`, which is the
failure the brief names.

Table by table, the scoped list is less uniform than it looks:

| table               | how it is scoped                           | note                                                                              |
| ------------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| `organizations`     | `id` via `org_memberships`                 | breaks Better Auth sign-in, blocker 2                                             |
| `org_subscriptions` | `organization_id`, not null                | direct                                                                            |
| `tasks`             | `organization_id`, **nullable**            | needs an `OR user_id = current` arm for personal tasks, or nulls become invisible |
| `orders`            | `organization_id`, not null                | direct                                                                            |
| `order_history`     | no org column, joins via `order_id`        | `EXISTS` against `orders`                                                         |
| `documents`         | `organization_id`, not null                | direct                                                                            |
| `rag_settings`      | `organization_id`, not null                | direct                                                                            |
| `chat_sessions`     | `organization_id`, not null                | direct                                                                            |
| `chat_messages`     | no org column, joins via `chat_session_id` | `EXISTS` against `chat_sessions`                                                  |
| `activity_logs`     | **no organization column at all**          | see below                                                                         |

`activity_logs` is in the brief's scope list but has only `user_id`. There is no
organization to key a policy on. It is user-scoped, and a membership policy cannot
be written for it without a schema change.

`org_memberships` is not in the brief's list but every policy above reads it. It has
to stay readable by the app role, or the policies become circular. That is
defensible, since membership rows are the authorization data itself, but it should
be a decision rather than an oversight.

`users` and `sessions` stay out, as the brief says. Better Auth owns them and reaches
them through the adapter on paths the app cannot wrap.

## The worker

`lib/queue/jobs/index-document.ts` reads `organizations` and `documents` from a
BullMQ job. There is no request and no user, so there is no identity to set. Two
honest options:

1. Give the worker a separate role holding `BYPASSRLS` and a separate connection
   string. The identity is "this is trusted infrastructure", stated once, in the
   role, instead of implied by a missing `SET LOCAL`.
2. Have the worker set `app.user_id` to the user the job acts for, where the job
   carries one. `index-document` does have an owning org on the document.

Option 1 is the one I would take. Option 2 looks safer and is not, because a job
without a natural user would silently get no rows.

Either way the worker needs its own connection string, which puts it back behind
blocker 1.

## Why I did not ship a partial version

The tempting move is to enable RLS on the six tables with a clean `organization_id`
and leave the rest. That produces a migration that passes CI, a changelog line
saying row-level security is enabled, and no enforcement at all, because the app
role bypasses it. Someone would then reasonably write a handler trusting the
database to catch a missing org filter.

The application-level checks in `lib/trpc/init.ts` and `lib/auth/guards.ts` are
untouched and remain the only authorization layer, which is exactly what they were
before this work started.

## What shipping it takes, in order

1. Split the database roles. An owner role for migrations, a non-superuser
   application role for queries, a worker role with `BYPASSRLS`. Requires changes to
   the platform provisioning in `kosuke.config.json`, `.env.example`,
   `docker-compose.yml`, both CI jobs, and the Render deploy. Nothing below this
   line does anything until it lands.
2. Decide how Better Auth reads `organizations` under RLS. Either grant its role an
   exemption on that table, or move the `session.create.before` lookup behind a
   `SECURITY DEFINER` function that takes a user id and returns their memberships.
   The function is the cleaner answer, since it keeps the exemption narrow.
3. Route the 45 `db.*` call sites through a helper that opens a transaction and sets
   `app.user_id`, so a missed site is one grep away rather than invisible.
4. Then the policies, as one migration, with `activity_logs` either given an
   `organization_id` or dropped from the list.
5. Then the tests, against a real Postgres, connecting as the application role.

## The test gap

The brief is right that an untested policy is not a policy. The current suite cannot
test one. `vitest.config.ts` runs `jsdom`, and the `testing` skill mandates mocking
the database, so `__tests__/lib/services/*` assert against Drizzle mock chains. A
mocked `db` cannot exercise a Postgres policy, by definition.

The CI job that runs `bun run test` has a Postgres service on `POSTGRES_URL`, so the
database is reachable. What is missing is a test project that runs in the `node`
environment against the real connection as the non-superuser role. That is worth
building regardless of RLS, and it is a prerequisite for step 5, not something to
bolt on after.

The shape, once a role exists:

```ts
// as a member of org A
await expect(readAs(memberOfA, 'orders', orgB_order_id)).resolves.toEqual([]);
await expect(readAs(memberOfA, 'orders', orgA_order_id)).resolves.toHaveLength(1);
// and the same for UPDATE and DELETE, which need WITH CHECK, not just USING
```

`UPDATE` and `DELETE` deserve their own assertions. A `USING` clause alone stops a
row from being _seen_. `WITH CHECK` is what stops a row from being written into
another organization.
