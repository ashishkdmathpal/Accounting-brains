#!/usr/bin/env node

/**
 * Lead Scraping Script
 * Uses SERP API to find businesses and Hunter.io to find email addresses
 *
 * Usage: node scripts/scrape-leads.js "location" "industry"
 * Example: node scripts/scrape-leads.js "California" "restaurants"
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Validate environment variables
if (!process.env.SERP_API_KEY) {
  console.error('❌ Error: SERP_API_KEY not found in .env file');
  process.exit(1);
}

if (!process.env.HUNTER_API_KEY) {
  console.error('❌ Error: HUNTER_API_KEY not found in .env file');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('❌ Usage: node scripts/scrape-leads.js "location" "industry"');
  console.error('Example: node scripts/scrape-leads.js "Los Angeles" "restaurants"');
  process.exit(1);
}

const location = args[0];
const industry = args[1];

console.log(`\n🔍 Searching for ${industry} in ${location}...`);

const SERP_API_URL = 'https://serpapi.com/search';
const HUNTER_API_URL = 'https://api.hunter.io/v2';

/**
 * Search for businesses using SERP API
 */
async function searchBusinesses(location, industry) {
  try {
    console.log('📊 Querying SERP API...\n');

    const response = await axios.get(SERP_API_URL, {
      params: {
        engine: 'google',
        q: `${industry} in ${location}`,
        api_key: process.env.SERP_API_KEY,
        num: 20, // Number of results
        gl: 'us', // Country
        hl: 'en' // Language
      }
    });

    const results = response.data.organic_results || [];
    const businesses = results.map((result, index) => ({
      id: index + 1,
      name: result.title,
      website: result.link,
      snippet: result.snippet,
      source: result.source || 'google'
    }));

    console.log(`✅ Found ${businesses.length} potential leads\n`);
    return businesses;
  } catch (error) {
    console.error('❌ Error with SERP API:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Find email addresses for a domain using Hunter.io
 */
async function findEmails(domain) {
  try {
    // Extract domain from URL
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];

    const response = await axios.get(`${HUNTER_API_URL}/domain-search`, {
      params: {
        domain: cleanDomain,
        api_key: process.env.HUNTER_API_KEY,
        limit: 3 // Limit emails per domain
      }
    });

    const data = response.data.data;
    if (!data || !data.emails || data.emails.length === 0) {
      return null;
    }

    // Get the most relevant email (usually owner/admin)
    const emails = data.emails
      .filter(e => e.confidence > 70) // Only high-confidence emails
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 2);

    return {
      company: data.organization,
      domain: cleanDomain,
      emails: emails.map(e => ({
        email: e.value,
        firstName: e.first_name,
        lastName: e.last_name,
        position: e.position,
        confidence: e.confidence
      }))
    };
  } catch (error) {
    // Hunter.io returns 404 if no emails found - this is normal
    if (error.response?.status === 404) {
      return null;
    }
    console.error(`⚠️  Error finding emails for ${domain}:`, error.response?.data?.errors || error.message);
    return null;
  }
}

/**
 * Enrich leads with email data
 */
async function enrichLeads(businesses) {
  console.log('📧 Finding email addresses...\n');

  const enrichedLeads = [];
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < businesses.length; i++) {
    const business = businesses[i];
    process.stdout.write(`  [${i + 1}/${businesses.length}] ${business.name}... `);

    const emailData = await findEmails(business.website);

    if (emailData && emailData.emails.length > 0) {
      enrichedLeads.push({
        ...business,
        ...emailData,
        status: 'enriched'
      });
      console.log(`✅ Found ${emailData.emails.length} email(s)`);
    } else {
      enrichedLeads.push({
        ...business,
        emails: [],
        status: 'no_emails'
      });
      console.log(`⚠️  No emails found`);
    }

    // Rate limiting - wait 1 second between requests
    if (i < businesses.length - 1) {
      await delay(1000);
    }
  }

  return enrichedLeads;
}

/**
 * Save leads to CSV file
 */
function saveToCSV(leads, location, industry) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `leads-${industry.replace(/\s+/g, '-')}-${location.replace(/\s+/g, '-')}-${timestamp}.csv`;
  const filepath = path.join(__dirname, '..', 'data', 'leads', filename);

  // Ensure directory exists
  const leadsDir = path.join(__dirname, '..', 'data', 'leads');
  if (!fs.existsSync(leadsDir)) {
    fs.mkdirSync(leadsDir, { recursive: true });
  }

  // Create CSV headers
  const headers = ['ID', 'Company', 'Domain', 'Email', 'First Name', 'Last Name', 'Position', 'Confidence', 'Snippet', 'Source'];
  let csvContent = headers.join(',') + '\n';

  // Add data rows
  leads.forEach(lead => {
    if (lead.emails && lead.emails.length > 0) {
      lead.emails.forEach(email => {
        const row = [
          lead.id,
          `"${(lead.company || lead.name || '').replace(/"/g, '""')}"`,
          lead.domain || '',
          email.email || '',
          email.firstName || '',
          email.lastName || '',
          `"${(email.position || '').replace(/"/g, '""')}"`,
          email.confidence || '',
          `"${(lead.snippet || '').replace(/"/g, '""')}"`,
          lead.source || ''
        ].join(',');
        csvContent += row + '\n';
      });
    } else {
      const row = [
        lead.id,
        `"${(lead.company || lead.name || '').replace(/"/g, '""')}"`,
        lead.domain || lead.website || '',
        '',
        '',
        '',
        '',
        '',
        `"${(lead.snippet || '').replace(/"/g, '""')}"`,
        lead.source || ''
      ].join(',');
      csvContent += row + '\n';
    }
  });

  fs.writeFileSync(filepath, csvContent);
  return filepath;
}

/**
 * Display summary statistics
 */
function displaySummary(leads) {
  const totalLeads = leads.length;
  const leadsWithEmails = leads.filter(l => l.emails && l.emails.length > 0).length;
  const totalEmails = leads.reduce((sum, l) => sum + (l.emails ? l.emails.length : 0), 0);

  console.log('\n' + '='.repeat(50));
  console.log('📊 LEAD GENERATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`  Total Businesses Found: ${totalLeads}`);
  console.log(`  Businesses with Emails: ${leadsWithEmails} (${Math.round(leadsWithEmails / totalLeads * 100)}%)`);
  console.log(`  Total Email Addresses:  ${totalEmails}`);
  console.log('='.repeat(50) + '\n');
}

// Main execution
(async () => {
  try {
    // Step 1: Search for businesses
    const businesses = await searchBusinesses(location, industry);

    if (businesses.length === 0) {
      console.log('⚠️  No businesses found. Try different search terms.');
      process.exit(0);
    }

    // Step 2: Enrich with email data
    const enrichedLeads = await enrichLeads(businesses);

    // Step 3: Save to CSV
    console.log('\n💾 Saving results...');
    const filepath = saveToCSV(enrichedLeads, location, industry);
    console.log(`✅ Leads saved to: ${filepath}`);

    // Step 4: Display summary
    displaySummary(enrichedLeads);

    console.log('📝 Next steps:');
    console.log('   1. Review the CSV file');
    console.log('   2. Import to HubSpot or your CRM');
    console.log('   3. Set up email campaigns in Brevo');
    console.log('   4. Schedule AI calls with Bland.ai\n');

  } catch (error) {
    console.error('\n❌ Lead generation failed');
    process.exit(1);
  }
})();
