# 33Mega Admin

Cloud Run web app for publishing **news posts** and **homepage slides** to the
33Mega site through a safe git-backed pipeline (validate → draft PR → preview →
publish). See [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for the full design.

No database: content is committed to this repo and deployed by GitHub Actions.

## Local development

```sh
cd admin
npm install
# one-time: generate admin credentials + JWT secret into secrets/
node scripts/setup-credentials.mjs jonathan@33mega.cloud peter@33mega.cloud
# run (loads secrets/ + needs GITHUB_TOKEN + OPENAI_API_KEY for full function)
GITHUB_TOKEN=ghp_xxx OPENAI_API_KEY=sk-xxx npm run dev
```

Open `http://localhost:8080`. `secrets/` is git-ignored.

## Environment / secrets

| Var | Purpose |
|---|---|
| `ADMIN_USERS` | JSON `{ "email": "scrypt$…" }` — from Secret Manager (or `secrets/admin-users.json` locally) |
| `JWT_SECRET` | random 32-byte hex, signs session JWTs |
| `GITHUB_TOKEN` | fine-grained PAT scoped to `jcmorgan2/33mega-website` (Contents + Pull requests: read/write) |
| `OPENAI_API_KEY` | OpenAI API key for AI assist (draft copy + SVG graphics) |
| `GITHUB_REPO` | defaults to `jcmorgan2/33mega-website` |
| `OPENAI_MODEL` | optional, defaults to `gpt-4o-mini` |

## Deploy to Cloud Run

**Live:** see the Cloud Run console for the service URL (not published here) — deployed to the
`electric-spark-468812-i6` GCP project (chosen because `mega33-cloud` couldn't be
linked to billing: the account is at its 5-project quota; relocate to
`mega33-cloud` once a quota increase clears). Secrets live in Secret Manager and
are injected as env vars. From the repo root:

```sh
PROJECT=electric-spark-468812-i6
REGION=europe-west1

# 1. Create secrets (once) — see scripts/setup-credentials.mjs output for values
gcloud secrets create admin-users     --project $PROJECT --data-file=admin/secrets/admin-users.json
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets create jwt-secret --project $PROJECT --data-file=-
printf '%s' "$GITHUB_TOKEN"      | gcloud secrets create github-token     --project $PROJECT --data-file=-
printf '%s' "$OPENAI_API_KEY" | gcloud secrets create openai-key       --project $PROJECT --data-file=-

# 2. Build + deploy from source (Cloud Build)
gcloud run deploy mega33-admin \
  --project $PROJECT --region $REGION --source admin --allow-unauthenticated --port 8080 \
  --set-secrets ADMIN_USERS=admin-users:latest,JWT_SECRET=jwt-secret:latest,GITHUB_TOKEN=github-token:latest,OPENAI_API_KEY=openai-key:latest
```

To rotate an admin password, re-run `setup-credentials.mjs`, then
`gcloud secrets versions add admin-users --data-file=admin/secrets/admin-users.json`
and redeploy (or the service picks up `:latest` on next revision).
