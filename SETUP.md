# AccountingBrains - Setup & Credentials Guide

This document contains all pending setup tasks and credentials required for the AccountingBrains website.

---

## Quick Status

| Feature | Status | Action Required |
|---------|--------|-----------------|
| Website Hosting | ✅ Done | GitHub Pages live |
| CMS (Decap) | ✅ Done | Working with GitHub OAuth |
| Contact Form | ⏳ Pending | Deploy Cloudflare Worker + Brevo |
| Newsletter | ⏳ Pending | Deploy Cloudflare Worker + Brevo |
| Analytics | ⏳ Pending | Add Google Analytics ID |
| Cal.com Scheduling | ⏳ Pending | Add Cal.com username |
| OG Images | ⏳ Pending | Convert SVG to PNG |
| Social Links | ⏳ Pending | Update footer with real URLs |

---

## All Required Keys & Credentials

| Key/Credential | Where to Get | Where to Add | Status |
|----------------|--------------|--------------|--------|
| `BREVO_API_KEY` | [Brevo Dashboard](https://app.brevo.com) → SMTP & API | Cloudflare Worker secrets | ⏳ Pending |
| `ADMIN_EMAIL` | Your notification email | Cloudflare Worker secrets | ⏳ Pending |
| `CAL_USERNAME` | [Cal.com](https://cal.com) | `src/contact.njk` line ~233 | ⏳ Pending |
| `GA_ID` | [Google Analytics](https://analytics.google.com) | `src/_data/site.json` → `gaId` | ⏳ Pending |
| Brevo List ID (Contacts) | Brevo → Contacts → Lists | `workers/contact-form.js` line 59 | Default: 2 |
| Brevo List ID (Newsletter) | Brevo → Contacts → Lists | `workers/newsletter.js` line 24 | Default: 3 |

---

## 1. Brevo Setup (Contact Form & Newsletter)

Brevo (formerly Sendinblue) handles:
- Contact form submissions → CRM
- Newsletter subscriptions → Email list
- Notification emails to admin

### 1.1 Create Brevo Account
1. Go to: **https://www.brevo.com**
2. Sign up for a free account (300 emails/day free)
3. Verify your email

### 1.2 Get API Key
1. Login to Brevo
2. Go to: **Settings** → **SMTP & API** → **API Keys**
3. Click **Generate a new API key**
4. Name it: `AccountingBrains Website`
5. Copy and save the key securely

```
BREVO_API_KEY: xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 1.3 Create Contact Lists
In Brevo, create two lists:

| List Name | List ID | Purpose |
|-----------|---------|---------|
| Website Contacts | 2 | Contact form submissions |
| Newsletter Subscribers | 3 | Newsletter signups |

**To create lists:**
1. Go to: **Contacts** → **Lists**
2. Click **Create a list**
3. Note the List ID (shown in URL: `/lists/XX`)

> **Important:** If your list IDs are different from 2 and 3, update them in:
> - `workers/contact-form.js` (line 59)
> - `workers/newsletter.js` (line 24)

### 1.4 Verify Sender Domain (Recommended)
For better email deliverability:
1. Go to: **Settings** → **Senders, Domains & Dedicated IPs**
2. Click **Add a new domain**
3. Add: `accountingbrains.com`
4. Add the DNS records to your domain

---

## 2. Deploy Cloudflare Workers

Worker files are located in the `/workers` directory.

### 2.1 Prerequisites
```bash
# Install Wrangler CLI globally
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### 2.2 Deploy Contact Form Worker
```bash
cd workers

# Create wrangler.toml from example
cp wrangler.toml.example wrangler.toml

# Edit wrangler.toml - set name to "accountingbrains-contact"
# and main to "contact-form.js"

# Deploy
wrangler deploy

# Add secrets
wrangler secret put BREVO_API_KEY
# Paste your Brevo API key when prompted

wrangler secret put NOTIFICATION_EMAIL
# Enter: hello@accountingbrains.com
```

### 2.3 Deploy Newsletter Worker
```bash
cd workers

# Edit wrangler.toml - change name to "accountingbrains-newsletter"
# and main to "newsletter.js"

# Deploy
wrangler deploy

# Add secrets
wrangler secret put BREVO_API_KEY
# Paste your Brevo API key when prompted
```

### 2.4 Worker URLs
After deployment, your worker URLs will be:

| Worker | URL | Used In |
|--------|-----|---------|
| Contact Form | `https://accountingbrains-contact.ashishkdmathpal.workers.dev` | `src/contact.njk` |
| Newsletter | `https://accountingbrains-newsletter.ashishkdmathpal.workers.dev` | `src/blog.njk` |

### 2.5 Update Website URLs
After deploying, update the API URLs in:

**Contact Form** (`src/contact.njk` line 531):
```javascript
const CONTACT_FORM_API = 'https://accountingbrains-contact.YOUR_SUBDOMAIN.workers.dev';
```

**Newsletter** (`src/blog.njk` line 489):
```javascript
const NEWSLETTER_API = 'https://accountingbrains-newsletter.YOUR_SUBDOMAIN.workers.dev';
```

---

## 3. Cal.com Scheduling Setup

### 3.1 Create Cal.com Account
1. Go to: **https://cal.com**
2. Sign up for a free account
3. Complete your profile

### 3.2 Create Event Type
1. Go to: **Event Types** → **New Event Type**
2. Create a "30 Minute Meeting" or "Free Consultation"
3. Configure availability
4. Note your username (e.g., `accountingbrains`)

### 3.3 Update Configuration
In `src/contact.njk`, find and update (around line 233):

```html
<!-- Before -->
data-cal-link="YOUR_CAL_USERNAME/30min"

<!-- After -->
data-cal-link="accountingbrains/30min"
```

Also update Cal.com script initialization (around line 248):
```javascript
Cal("init", {origin:"https://cal.com"});
Cal("ui", {"styles":{"branding":{"brandColor":"#0f172a"}}});
Cal("floatingButton", {"calLink":"accountingbrains/30min"});
```

---

## 4. Google Analytics Setup

### 4.1 Create GA4 Property
1. Go to: **https://analytics.google.com**
2. Click **Admin** → **Create Property**
3. Enter property name: `AccountingBrains`
4. Set up data stream for web
5. Get your Measurement ID (format: `G-XXXXXXXXXX`)

### 4.2 Update Configuration
In `src/_data/site.json`, update:
```json
{
  "gaId": "G-XXXXXXXXXX"
}
```

---

## 5. OG Images for Social Sharing

SVG images have been created at:
- `src/assets/images/og-image.svg` (1200x630)
- `src/assets/images/twitter-image.svg` (1200x630)

### 5.1 Convert to PNG
Social platforms require PNG images. Convert using:

**Option 1: Online Converter**
1. Go to: https://cloudconvert.com/svg-to-png
2. Upload the SVG files
3. Set dimensions: 1200x630
4. Download PNGs

**Option 2: Command Line (if ImageMagick installed)**
```bash
cd src/assets/images
convert -density 300 og-image.svg -resize 1200x630 og-image.png
convert -density 300 twitter-image.svg -resize 1200x630 twitter-image.png
```

**Option 3: Figma/Canva**
- Import SVG and export as PNG at 1200x630

### 5.2 File References
The meta tags in `src/_layouts/base.njk` reference:
- `/assets/images/og-image.png` (Open Graph)
- `/assets/images/twitter-image.png` (Twitter Cards)

---

## 6. Social Media Links

Update footer social links in `src/_includes/footer.njk`:

| Platform | Current | Update To |
|----------|---------|-----------|
| Twitter | `#` | `https://twitter.com/accountingbrains` |
| LinkedIn | `#` | `https://linkedin.com/company/accountingbrains` |

---

## 7. Existing Credentials (Already Configured)

### 7.1 GitHub OAuth (for Decap CMS)
- **Status:** ✅ Done
- **Client ID:** Configured in GitHub OAuth App
- **Callback URL:** `https://decap-cms-oauth.ashishkdmathpal.workers.dev/callback`

### 7.2 Cloudflare Workers (Existing)
| Worker | URL | Status |
|--------|-----|--------|
| decap-cms-oauth | decap-cms-oauth.ashishkdmathpal.workers.dev | ✅ Working |
| accountingbrains-contact | accountingbrains-contact.ashishkdmathpal.workers.dev | ⏳ Needs secrets |
| accountingbrains-newsletter | accountingbrains-newsletter.ashishkdmathpal.workers.dev | ⏳ Not deployed |

---

## 8. Environment Variables Summary

### Cloudflare Worker: `accountingbrains-contact`
| Variable | Description | Status |
|----------|-------------|--------|
| `BREVO_API_KEY` | Brevo API key for emails & CRM | ⏳ Pending |
| `NOTIFICATION_EMAIL` | Email to receive form notifications | ⏳ Pending |

### Cloudflare Worker: `accountingbrains-newsletter`
| Variable | Description | Status |
|----------|-------------|--------|
| `BREVO_API_KEY` | Brevo API key for subscriptions | ⏳ Pending |

### Site Configuration: `src/_data/site.json`
| Field | Description | Current Value | Status |
|-------|-------------|---------------|--------|
| `gaId` | Google Analytics ID | `""` (empty) | ⏳ Pending |
| `url` | Production URL | `https://accountingbrains.com` | ✅ Set |
| `email` | Contact email | `hello@accountingbrains.com` | ✅ Set |
| `phone` | Contact phone | `+1 (855) 228-2724` | ✅ Set |

---

## 9. Post-Setup Checklist

### Brevo & Forms
- [ ] Create Brevo account at brevo.com
- [ ] Generate Brevo API key
- [ ] Create "Website Contacts" list (ID: 2)
- [ ] Create "Newsletter Subscribers" list (ID: 3)
- [ ] (Optional) Verify sender domain

### Cloudflare Workers
- [ ] Install Wrangler CLI: `npm install -g wrangler`
- [ ] Deploy contact-form worker
- [ ] Add `BREVO_API_KEY` secret to contact worker
- [ ] Add `NOTIFICATION_EMAIL` secret to contact worker
- [ ] Deploy newsletter worker
- [ ] Add `BREVO_API_KEY` secret to newsletter worker
- [ ] Update worker URLs in contact.njk and blog.njk

### Cal.com
- [ ] Create Cal.com account
- [ ] Create 30-minute event type
- [ ] Update Cal.com username in `src/contact.njk`

### Google Analytics
- [ ] Create GA4 property
- [ ] Add GA ID to `src/_data/site.json`

### Social & Images
- [ ] Convert OG image SVG to PNG (1200x630)
- [ ] Convert Twitter image SVG to PNG (1200x630)
- [ ] Update footer social media links

### Final Testing
- [ ] Test contact form submission
- [ ] Test newsletter signup
- [ ] Test Cal.com scheduling widget
- [ ] Verify Google Analytics tracking
- [ ] Check OG images on social media debuggers

---

## 10. Testing Commands

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
curl -X POST https://accountingbrains-newsletter.ashishkdmathpal.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "source": "blog_newsletter"
  }'
```

### Validate OG Images
- Facebook: https://developers.facebook.com/tools/debug/
- Twitter: https://cards-dev.twitter.com/validator
- LinkedIn: https://www.linkedin.com/post-inspector/

---

## 11. File References

| File | Purpose |
|------|---------|
| `workers/contact-form.js` | Contact form Cloudflare Worker |
| `workers/newsletter.js` | Newsletter Cloudflare Worker |
| `workers/wrangler.toml.example` | Worker deployment config template |
| `src/_data/site.json` | Site configuration (GA ID, contact info) |
| `src/contact.njk` | Contact form + Cal.com widget |
| `src/blog.njk` | Newsletter form |
| `src/_layouts/base.njk` | OG/Twitter meta tags |
| `src/_includes/footer.njk` | Social media links |
| `src/assets/images/og-image.svg` | OG image (convert to PNG) |
| `src/assets/images/twitter-image.svg` | Twitter image (convert to PNG) |

---

## 12. Support & Resources

- **Brevo Documentation:** https://developers.brevo.com/
- **Brevo API Reference:** https://developers.brevo.com/reference
- **Cloudflare Workers:** https://developers.cloudflare.com/workers/
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/
- **Cal.com Embed:** https://cal.com/docs/embed
- **Google Analytics 4:** https://support.google.com/analytics
- **OG Debugger:** https://developers.facebook.com/tools/debug/

---

*Last updated: December 2024*
