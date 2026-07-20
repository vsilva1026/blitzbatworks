# Blitz Bat Publish Worker

Cloudflare Worker that lets the playground publish to GitHub without exposing the token to Eli's browser.

## Deploy (one-time)

Install wrangler if you don't have it:
```
npm install -g wrangler
wrangler login
```

From this `worker/` directory:

```
wrangler deploy
```

Then set the two secrets:

```
wrangler secret put GITHUB_TOKEN
# paste your GitHub PAT (needs "repo" scope, or fine-grained with Contents: write)

wrangler secret put PUBLISH_PASSPHRASE
# type the shared passphrase you'll give to Eli (e.g. "wiffle2026")
```

## Route it to blitzbatworks.com/api/*

1. Cloudflare dashboard → `blitzbat-publish` Worker → Settings → Domains & Routes
2. Add Route → Zone: `blitzbatworks.com`, Route: `blitzbatworks.com/api/*`

Now `https://blitzbatworks.com/api/publish` reaches this Worker.

## Rotate the passphrase

If Eli's passphrase leaks:
```
wrangler secret put PUBLISH_PASSPHRASE
# new passphrase
```
Old one stops working immediately. Give him the new one.

## Rotate the GitHub token

If the token is compromised: revoke on GitHub, create a new one, then:
```
wrangler secret put GITHUB_TOKEN
```
