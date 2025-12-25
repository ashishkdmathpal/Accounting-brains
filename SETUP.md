# AccountingBrains - Setup & Credentials Guide

This document contains all pending setup tasks and credentials required for the AccountingBrains website.

---

## Quick Status

| Feature | Status | Action Required |
|---------|--------|-----------------|
| Website Hosting | Done | GitHub Pages live |
| CMS (Decap) | Done | Working with GitHub OAuth |
| Contact Form | Pending | Deploy Cloudflare Worker + Brevo |
| Newsletter | Pending | Same as Contact Form |
| Analytics | Pending | Add Google Analytics ID |
| Cal.com Scheduling | Pending | Add Cal.com username |

---

## 1. Brevo Setup (Contact Form & Newsletter)

### 1.1 Create Brevo Account
1. Go to: **https://www.brevo.com**
2. Sign up for a free account
3. Verify your email

### 1.2 Get API Key
1. Login to Brevo
2. Go to: **Settings** → **SMTP & API** → **API Keys**
3. Click **Generate a new API key**
4. Copy and save the key securely

```
BREVO_API_KEY: [YOUR_API_KEY_HERE]
```

### 1.3 Create Contact Lists
In Brevo, create two lists:

| List Name | List ID | Purpose |
|-----------|---------|---------|
| Website Contacts | 2 | Contact form submissions |
| Newsletter | 3 | Newsletter subscribers |

**To create lists:**
1. Go to: **Contacts** → **Lists**
2. Click **Create a list**
3. Note the List ID (shown in URL or list details)

> **Note:** If your list IDs are different, update them in:
> `cloudflare-workers/contact-form/worker.js` (lines 59 and 176)

### 1.4 Verify Sender Domain (Recommended)
For better email deliverability:
1. Go to: **Settings** → **Senders, Domains & Dedicated IPs**
2. Add and verify your domain: `accountingbrains.com`

---

## 2. Deploy Contact Form Worker

### 2.1 Prerequisites
- Cloudflare account (already set up)
- Wrangler CLI installed: `npm install -g wrangler`

### 2.2 Deploy the Worker
```bash
cd cloudflare-workers/contact-form
wrangler login  # If not already logged in
wrangler deploy
```

### 2.3 Add Secrets
```bash
# Add Brevo API Key
wrangler secret put BREVO_API_KEY
# Paste your Brevo API key when prompted

# Add Admin Email (receives form notifications)
wrangler secret put ADMIN_EMAIL
# Enter: hello@accountingbrains.com
```

### 2.4 Worker Endpoints
After deployment, your worker URL will be:
```
https://accountingbrains-contact.ashishkdmathpal.workers.dev
```

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | POST | Contact form submission |
| `/newsletter` | POST | Newsletter signup |

---

## 3. Cal.com Scheduling Setup

### 3.1 Create Cal.com Account
1. Go to: **https://cal.com**
2. Sign up for a free account
3. Create a 30-minute event type

### 3.2 Update Configuration
In `src/contact.njk`, find and replace:
```javascript
// Line ~233
data-cal-link="YOUR_CAL_USERNAME/30min"
```

Replace `YOUR_CAL_USERNAME` with your actual Cal.com username.

---

## 4. Google Analytics Setup

### 4.1 Create GA4 Property
1. Go to: **https://analytics.google.com**
2. Create a new GA4 property
3. Get your Measurement ID (format: `G-XXXXXXXXXX`)

### 4.2 Update Configuration
In `src/_data/site.json`, update:
```json
{
  "gaId": "G-XXXXXXXXXX"
}
```

---

## 5. Existing Credentials (Already Configured)

### 5.1 GitHub OAuth (for Decap CMS)
- **Status:** Done
- **Client ID:** Configured in GitHub OAuth App
- **Callback URL:** `https://decap-cms-oauth.ashishkdmathpal.workers.dev/callback`

### 5.2 Cloudflare Workers
| Worker | URL | Secrets |
|--------|-----|---------|
| decap-cms-oauth | decap-cms-oauth.ashishkdmathpal.workers.dev | GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET |
| accountingbrains-contact | accountingbrains-contact.ashishkdmathpal.workers.dev | BREVO_API_KEY, ADMIN_EMAIL (pending) |

---

## 6. Environment Variables Summary

### Cloudflare Worker: `accountingbrains-contact`
| Variable | Description | Status |
|----------|-------------|--------|
| `BREVO_API_KEY` | Brevo API key for emails & CRM | Pending |
| `ADMIN_EMAIL` | Email to receive form notifications | Pending |

### Site Configuration: `src/_data/site.json`
| Field | Description | Status |
|-------|-------------|--------|
| `gaId` | Google Analytics ID | Pending |
| `url` | Production URL | Set to accountingbrains.com |
| `email` | Contact email | Set |
| `phone` | Contact phone | Set |

---

## 7. Post-Setup Checklist

- [ ] Create Brevo account
- [ ] Get Brevo API key
- [ ] Create Brevo contact lists (IDs 2 and 3)
- [ ] Deploy `accountingbrains-contact` worker
- [ ] Add `BREVO_API_KEY` secret to worker
- [ ] Add `ADMIN_EMAIL` secret to worker
- [ ] Test contact form submission
- [ ] Test newsletter signup
- [ ] Create Cal.com account
- [ ] Update Cal.com username in contact.njk
- [ ] Create Google Analytics property
- [ ] Add GA ID to site.json
- [ ] (Optional) Set up custom domain

---

## 8. Testing

### Test Contact Form
```bash
curl -X POST https://accountingbrains-contact.ashishkdmathpal.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "service": "bookkeeping",
    "message": "This is a test message"
  }'
```

### Test Newsletter Signup
```bash
curl -X POST https://accountingbrains-contact.ashishkdmathpal.workers.dev/newsletter \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test"
  }'
```

---

## 9. Support & Resources

- **Brevo Documentation:** https://developers.brevo.com/
- **Cloudflare Workers:** https://developers.cloudflare.com/workers/
- **Cal.com Embed:** https://cal.com/docs/embed
- **Google Analytics:** https://support.google.com/analytics

---

*Last updated: December 2024*
