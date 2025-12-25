# AccountingBrains - AI-Powered CPA Marketing Website

Professional CPA website built with 11ty, Tailwind CSS, and AI automation. Fully responsive, mobile-first design with integrated lead generation and content creation tools.

## 🚀 Features

### Website
- ✅ **11ty Static Site Generator** - Fast, SEO-optimized pages
- ✅ **Tailwind CSS** - Mobile-first responsive design
- ✅ **Decap CMS** - Easy blog management
- ✅ **GitHub Pages** - Free hosting with auto-deployment
- ✅ **Formspree Integration** - Contact forms and newsletters
- ✅ **Cal.com Scheduling** - Embedded appointment booking
- ✅ **Cookie Consent** - GDPR compliant
- ✅ **Google Analytics 4** - Traffic tracking

### AI Automation
- 🤖 **AI Blog Generation** (OpenRouter) - Auto-generate SEO-optimized posts
- 🔍 **Lead Scraping** (SERP API + Hunter.io) - Find and enrich leads
- 📞 **AI Calling** (Bland.ai) - Automated outreach calls

### Pages
- Homepage with hero, features, services, testimonials
- Services page with detailed offerings
- About page with team and mission
- Pricing page with interactive monthly/annual toggle
- Contact page with forms and scheduling
- Blog with pagination and sample post
- Privacy Policy & Terms of Service

## 📋 Prerequisites

- Node.js 18+ and pnpm
- Git
- GitHub account (for deployment)
- API keys (see Environment Variables below)

## 🛠️ Installation

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/Accounting-brains.git
cd Accounting-brains
pnpm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# OpenRouter AI API (for blog generation)
OPENROUTER_API_KEY=sk-or-xxxxx

# Lead Generation
SERP_API_KEY=xxxxx
HUNTER_API_KEY=xxxxx

# Email Marketing
BREVO_API_KEY=xxxxx

# AI Calling
BLAND_API_KEY=xxxxx
BLAND_PHONE_NUMBER=+1xxxxxxxxxx

# CRM
HUBSPOT_API_KEY=xxxxx

# Analytics
GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Forms
FORMSPREE_FORM_ID=xxxxx
```

### 3. Configure Forms and Scheduling

#### Formspree Setup:
1. Sign up at [formspree.io](https://formspree.io)
2. Create a new form
3. Replace `YOUR_FORMSPREE_ID` in:
   - `src/contact.njk`
   - `src/blog.njk`

#### Cal.com Setup:
1. Sign up at [cal.com](https://cal.com)
2. Create a 30-minute meeting type
3. Replace `YOUR_CAL_USERNAME` in `src/contact.njk`

### 4. Google Analytics:
1. Create a GA4 property at [analytics.google.com](https://analytics.google.com)
2. Get your Measurement ID (G-XXXXXXXXXX)
3. Add to `src/_data/site.json`:

```json
{
  "gaId": "G-XXXXXXXXXX"
}
```

## 🏃 Development

Start the development server:

```bash
pnpm run dev
```

Visit `http://localhost:8080`

The site will automatically reload on file changes.

## 🏗️ Build

Build for production:

```bash
pnpm run build
```

This creates the `_site` directory with optimized files.

## 🚀 Deployment to GitHub Pages

### 1. Enable GitHub Pages

1. Go to your repository settings
2. Navigate to **Pages**
3. Source: **GitHub Actions**

### 2. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

GitHub Actions will automatically build and deploy your site!

### 3. Custom Domain (Optional)

1. Add a `CNAME` file to `src/`:
   ```
   accountingbrains.com
   ```

2. In repository settings → Pages, add your custom domain

3. Configure DNS at your domain registrar:

**A Records:**
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

**CNAME:**
```
www.accountingbrains.com → YOUR_USERNAME.github.io
```

## 🤖 AI Automation Tools

### Generate Blog Post

```bash
pnpm run generate:blog "Tax Deductions for Restaurants" "restaurant taxes"
```

This creates a new blog post in `src/blog/` with:
- SEO-optimized title and meta description
- Professionally written content (1000-1500 words)
- Relevant categories and tags
- Automatic publishing date

### Scrape Leads

```bash
pnpm run scrape:leads "Los Angeles" "restaurants"
```

This creates a CSV file in `data/leads/` with:
- Company names and websites
- Email addresses (via Hunter.io)
- Contact names and positions
- Confidence scores

### AI Calling Campaign

```bash
node scripts/ai-calling.js data/leads/leads-restaurants-los-angeles-2025-01-15.csv
```

**Note:** Requires phone numbers in your lead CSV. See script comments for setup.

## 📁 Project Structure

```
Accounting-brains/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment
├── src/
│   ├── _data/
│   │   └── site.json           # Site metadata
│   ├── _includes/
│   │   ├── cookie-consent.njk  # Cookie banner
│   │   ├── footer.njk          # Site footer
│   │   └── header.njk          # Site header
│   ├── _layouts/
│   │   ├── base.njk            # Base template
│   │   └── post.njk            # Blog post template
│   ├── admin/
│   │   ├── index.html          # Decap CMS admin
│   │   └── config.yml          # CMS configuration
│   ├── assets/
│   │   ├── images/             # Image files
│   │   └── js/
│   │       └── main.js         # Site JavaScript
│   ├── blog/
│   │   └── sample-post.md      # Example blog post
│   ├── css/
│   │   └── styles.css          # Tailwind styles
│   ├── about.njk               # About page
│   ├── contact.njk             # Contact page
│   ├── index.njk               # Homepage
│   ├── pricing.njk             # Pricing page
│   ├── privacy.njk             # Privacy policy
│   ├── services.njk            # Services page
│   └── terms.njk               # Terms of service
├── scripts/
│   ├── generate-blog.js        # AI blog generator
│   ├── scrape-leads.js         # Lead scraping
│   └── ai-calling.js           # AI calling
├── .eleventy.js                # 11ty configuration
├── tailwind.config.js          # Tailwind configuration
├── package.json                # Dependencies
└── README.md                   # This file
```

## 🎨 Customization

### Colors

Edit `tailwind.config.js`:

```javascript
colors: {
  primary: {
    // Your primary color shades
    600: '#0284c7',
  },
  accent: {
    // Your accent color shades
    600: '#c026d3',
  }
}
```

### Content

All page content is in the `src/` directory. Edit `.njk` files to update:
- Homepage: `src/index.njk`
- Services: `src/services.njk`
- Pricing: `src/pricing.njk`
- etc.

### Team Members

Edit `src/about.njk` to update team information.

## 📝 Content Management

### Adding Blog Posts

#### Option 1: Decap CMS (Recommended)
1. Visit `/admin` on your deployed site
2. Log in with GitHub
3. Click "New Blog Post"
4. Fill in the form and publish

#### Option 2: Manual
1. Create a new `.md` file in `src/blog/`
2. Add frontmatter:

```markdown
---
layout: post.njk
title: "Your Post Title"
description: "SEO description"
date: 2025-01-15
author: "Your Name"
category: "Tax Planning"
tags: ["tax", "business"]
readTime: 5
---

Your content here...
```

3. Commit and push to deploy

#### Option 3: AI Generation
```bash
pnpm run generate:blog "Your Topic" "target keyword"
```

## 🔒 Security & Compliance

### Environment Variables
- Never commit `.env` to Git (already in `.gitignore`)
- Use GitHub Secrets for deployment variables

### GDPR Compliance
- Cookie consent banner included
- Privacy policy template provided
- Update with your specific data practices

### TCPA Compliance (AI Calling)
- Check Do Not Call registry before calling
- Get explicit consent for automated calls
- Provide opt-out options
- Keep call records

## 📊 Analytics

### Google Analytics 4
- Track page views, events, conversions
- Monitor traffic sources
- Analyze user behavior

### Formspree
- Form submission tracking
- Email notifications
- Spam protection

## 🆘 Troubleshooting

### Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules _site
pnpm install
pnpm run build
```

### Styles Not Loading
- Check `postcss.config.js` is present
- Ensure Tailwind is installed: `pnpm install -D tailwindcss`
- Verify `src/css/styles.css` has `@tailwind` directives

### Forms Not Working
- Verify Formspree form ID is correct
- Check form `action` attribute
- Ensure email is verified in Formspree

### GitHub Actions Failing
- Check `.github/workflows/deploy.yml`
- Ensure GitHub Pages is enabled
- Verify pnpm lockfile exists

## 📚 Resources

- [11ty Documentation](https://www.11ty.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [Formspree Docs](https://formspree.io/docs)
- [Cal.com Documentation](https://cal.com/docs)
- [OpenRouter API](https://openrouter.ai/docs)
- [Bland.ai Docs](https://docs.bland.ai/)

## 📄 License

MIT License - feel free to use this for your own projects!

## 🤝 Support

Questions or issues?
- Open an issue on GitHub
- Email: hello@accountingbrains.com

---

Built with ❤️ using 11ty, Tailwind CSS, and AI
