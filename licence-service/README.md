# SerpY Licence Service

The only hosted piece of the SerpY desktop product. Everything else — the API,
the business logic, the PDF rendering — runs on the customer's own machine.

| Endpoint | Called by | Purpose |
| --- | --- | --- |
| `POST /api/signup` | app renderer | Record the buyer, open a Razorpay order |
| `POST /api/verify-payment` | app renderer | Verify the payment signature, provision the customer's database, mint a licence key |
| `POST /api/activate` | Electron main | Exchange a licence key for scoped database credentials |
| `POST /api/login` | app renderer | Check an email and password against the customer's own database, return their licence key |
| `POST /api/recover-key` | app renderer | Mail a replacement licence key to the address that bought it |
| `POST /api/renew` + `/api/verify-renewal` | app renderer | Buy and record another year of support |

## Signing in without a licence key

A new computer has no database yet, so there is nothing local to check a password
against. `login` closes that gap: this service already holds every customer's
database credentials, so it opens their database, verifies the password against
the real `users` collection, and hands back the licence key — which the app then
activates exactly as if it had been typed.

Checking the customer's own database rather than a copy of the password kept here
is deliberate. A copy would go stale the moment someone changed their password in
the app; this cannot.

- **Only the address on the licence record works.** Staff accounts are unknown to
  this service and are meant to stay that way — an employee signs in to a computer
  their administrator has already set up.
- If the owner changed their email during first-run setup, the licence record and
  their account disagree. The lookup falls back to the sole administrator in that
  database, and gives up if there is more than one.
- Eight wrong passwords locks that licence out of this endpoint for 15 minutes.
  It is a public password oracle otherwise.
- A wrong password and an unknown address get the identical reply.

## Lost licence keys

`recover-key` mails the key to the address on the licence record. Keys are stored
sealed (see `LICENCE_KEY_SECRET`) as well as hashed, so this normally sends the
key they already have and changes nothing.

Licences issued before sealing existed — or sealed under a secret that has since
changed — have no readable copy, and a hash cannot be reversed. Those get a
**new** key, and the old one stops working:

- Machines already activated keep running. They hold their database credentials
  locally and never re-check the key.
- Those machines still have the *old* key saved, so a support renewal started
  from one will be rejected until it is activated again with the new key.
  Re-activating a machine SerpY already knows costs no extra activation slot.
- Signing in through `login` heals this: the replacement key is sealed as it is
  issued, so it is the last time that licence rotates.

The reply is deliberately identical whether or not the address has a licence, and
there is one send per licence per five minutes.

It needs SMTP (`LICENCE_SMTP_*` below). Without it the endpoint returns a 500 and
logs why — customers are then stuck with support as their only route, so set it
up before going live.

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
| `LICENCE_SMTP_HOST` | SMTP host used to mail replacement licence keys, e.g. `smtp.gmail.com` |
| `LICENCE_SMTP_PORT` | SMTP port (defaults to 587; 465 is treated as implicit TLS) |
| `LICENCE_SMTP_USER` | SMTP username — also the fallback From address |
| `LICENCE_SMTP_PASS` | SMTP password or app password |
| `LICENCE_MAIL_FROM` | Optional From header, e.g. `"SerpY" <licences@yourdomain.com>` |
| `LICENCE_KEY_SECRET` | Passphrase that seals stored licence keys so they can be handed back on sign-in. Changing it makes existing sealed keys unreadable, which costs one key rotation per customer — not data |

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
