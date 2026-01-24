# WhistlerBrew Demos - API Keys & Secrets

This directory contains all API keys, tokens, and credentials for the WhistlerBrew Demos project.

## 🔒 Security

**CRITICAL**: This directory is excluded from git via `.gitignore`
- Never commit `api-keys.json` to version control
- Only `.gitkeep` and this `README.md` are tracked

## 📋 Credentials Inventory

### Google Places API
- **Purpose**: Geocoding and location search for SPS Briefing tool
- **Location**: `.env.local` (root directory)
- **Docs**: https://developers.google.com/maps/documentation/places/web-service

### Cloudflare Pages
- **Purpose**: Deployment and hosting
- **Account ID**: Shared across all Cloudflare projects
- **API Token**: Used for GitHub Actions auto-deployment
- **Permissions**: Edit Cloudflare Workers (includes Pages)
- **Dashboard**: https://dash.cloudflare.com

### GitHub Actions
- **Purpose**: Auto-deploy on push to main branch
- **Secrets Location**: https://github.com/MikeBrew123/whistlerbrew-demos/settings/secrets/actions
- **Required Secrets**:
  - `CLOUDFLARE_API_TOKEN` - Cloudflare API token
  - `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account identifier

## 🔑 Key Rotation

When rotating keys:
1. Update `api-keys.json` in this directory
2. Update `.env.local` (for local development)
3. Update GitHub secrets (for deployment)
4. Update `last_rotated` field in `api-keys.json`
5. Test deployment before revoking old key

## 📁 File Structure

```
secrets/
├── .gitkeep           # Ensures directory is tracked in git
├── README.md          # This file (tracked in git)
└── api-keys.json      # All credentials (NOT tracked in git)
```

## 🚨 Emergency Access

If credentials are lost or compromised:

1. **Google Places API**: Regenerate at https://console.cloud.google.com/apis/credentials
2. **Cloudflare API Token**: Create new at https://dash.cloudflare.com/profile/api-tokens
3. **GitHub Secrets**: Update at repo Settings → Secrets and variables → Actions

## 📝 Notes

- This project shares the same Cloudflare account as carnivore-weekly
- Account ID is the same across projects (safe to reuse)
- API tokens are project-specific (create separate tokens per project)
- Never share API tokens publicly or in screenshots

---

Last updated: 2026-01-24
