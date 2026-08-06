# SerpY Licence Service

The only hosted piece of the SerpY desktop product. Everything else — the API,
the business logic, the PDF rendering — runs on the customer's own machine.

Three endpoints:

| Endpoint | Called by | Purpose |
| --- | --- | --- |
| `POST /api/signup` | app renderer | Record the buyer, open a Razorpay order |
| `POST /api/verify-payment` | app renderer | Verify the payment signature, provision the customer's database, mint a licence key |
| `POST /api/activate` | Electron main | Exchange a licence key for scoped database credentials |

## Why it has to exist

A one-time payment gate enforced only on the customer's machine is a file edit
away from being bypassed. Payment verification and licence issuance therefore
happen somewhere the customer does not control. It is one serverless function
on a free tier — there is no server to operate.

## Deploy

```bash
cd licence-service
npx vercel deploy --prod
```

Then point the desktop app at it by setting `SERPY_LICENCE_API` in
`electron/main.js`, or via the environment at build time.

## Environment variables

Set these in the Vercel project settings. None of them belong in the repo.

| Variable | What it is |
| --- | --- |
| `LICENCE_DB_URI` | Connection string for the licence database (a small Atlas database of your own, separate from customer data) |
| `RAZORPAY_KEY_ID` | Razorpay key id — publishable, sent to the client |
| `RAZORPAY_KEY_SECRET` | Razorpay secret — signs and verifies payments, never leaves the server |
| `LICENCE_PRICE_PAISE` | Price in paise, e.g. `1500000` for ₹15,000 |
| `ATLAS_PUBLIC_KEY` | Atlas programmatic API key, public half |
| `ATLAS_PRIVATE_KEY` | Atlas programmatic API key, private half |
| `ATLAS_PROJECT_ID` | Atlas project (group) id that holds the customer cluster |
| `ATLAS_CLUSTER_NAME` | Cluster name, e.g. `serpy-prod` |
| `ATLAS_CLUSTER_HOST` | SRV host, e.g. `serpy-prod.ab12c.mongodb.net` |
| `LICENCE_MAX_MACHINES` | Machines one purchase may activate (defaults to 3) |

### Getting the Atlas API key

Atlas → Access Manager → Project Access → **Create API Key**, with the
**Project Owner** role (needed to create database users). Save both halves; the
private half is shown once.

## Things to know before going live

**The Atlas IP access list must allow `0.0.0.0/0`.** Customers connect from
their own offices, from addresses you cannot know in advance. This is safe only
because every customer gets credentials scoped to their own database — the
network is not what isolates them, the credential scope is.

**Atlas caps database users at 100 per project.** That is your customer ceiling
on one project. Past that, shard across projects and store which project each
customer belongs to on their licence record.

**Customers can extract their own connection string.** It lives on their
machine, so this is unavoidable. It grants `readWrite` on their own database and
nothing else, so the worst case is a customer manipulating their own data.

**Revoking a licence** means setting `status: 'revoked'` on the record *and*
calling `atlas.deleteUser(dbUsername)`. The status alone will not stop a machine
that already holds the credentials.
