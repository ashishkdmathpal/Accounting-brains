#!/usr/bin/env node

/**
 * AI Calling Script using Bland.ai
 * Automates outreach calls to leads with natural AI conversations
 *
 * Usage: node scripts/ai-calling.js <csv-file>
 * Example: node scripts/ai-calling.js data/leads/leads-restaurants-california-2025-01-15.csv
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Validate environment variables
if (!process.env.BLAND_API_KEY) {
  console.error('❌ Error: BLAND_API_KEY not found in .env file');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('❌ Usage: node scripts/ai-calling.js <csv-file>');
  console.error('Example: node scripts/ai-calling.js data/leads/leads-restaurants-california-2025-01-15.csv');
  process.exit(1);
}

const csvFilePath = args[0];

// Check if file exists
if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ File not found: ${csvFilePath}`);
  process.exit(1);
}

console.log(`\n📞 AI Calling Campaign Manager`);
console.log(`📄 Loading leads from: ${csvFilePath}\n`);

const BLAND_API_URL = 'https://api.bland.ai/v1';

/**
 * Parse CSV file
 */
function parseCSV(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  const leads = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
    const lead = {};
    headers.forEach((header, index) => {
      lead[header.toLowerCase().replace(/\s+/g, '_')] = values[index];
    });

    // Only include leads with phone numbers (you'd need to add phone scraping to scrape-leads.js)
    // For now, we'll process all leads and show how it would work
    if (lead.company && lead.company !== '') {
      leads.push(lead);
    }
  }

  return leads;
}

/**
 * Create AI call script/prompt for Bland.ai
 */
function createCallScript(lead) {
  return {
    prompt: `You are calling on behalf of AccountingBrains, a modern CPA firm that combines expert accounting with AI automation.

Your Goal: Schedule a free 15-minute consultation to discuss their accounting needs.

Lead Information:
- Company: ${lead.company}
- Contact: ${lead.first_name || 'the business owner'} ${lead.last_name || ''}
- Industry: Based on context

Call Script (Natural conversation flow):

1. Introduction (friendly, professional):
   "Hi, this is calling from AccountingBrains. Am I speaking with ${lead.first_name || 'the owner'}?"
   [If yes] "Great! I'm reaching out because we specialize in helping businesses like ${lead.company} save money on taxes and streamline their accounting."

2. Value Proposition (brief, specific):
   "We use AI-powered bookkeeping combined with expert CPA review to deliver results 80% faster than traditional firms - and our clients typically save $10,000+ annually on their taxes."

3. Ask Discovery Questions:
   - "Are you currently working with an accountant?"
   - "What's your biggest accounting or tax challenge right now?"
   - "How much time does your team spend on bookkeeping each month?"

4. Overcome Objections:
   - "Already have an accountant": "That's great. Many of our clients switched because we found deductions their previous accountant missed. Would you be open to a second opinion?"
   - "Too busy": "I completely understand. That's exactly why we built this - to save you time. The consultation is just 15 minutes, can we find a time next week?"
   - "Too expensive": "Our starter plan is actually $199/month, less than most firms charge. Plus we guarantee ROI through tax savings."

5. Schedule Meeting:
   "Based on what you've shared, I think our team could really help. Can I schedule you for a free 15-minute consultation? We have openings on [suggest 2-3 times]."

6. Closing:
   - If yes: "Perfect! I'm sending a calendar invite to [confirm email]. Looking forward to speaking with you!"
   - If no: "No problem. Can I send you some information via email? That way you have it when you're ready."

Conversation Style:
- Be warm, professional, and conversational
- Listen actively and adapt based on their responses
- Don't be pushy - if they're not interested, politely exit
- Take notes on their pain points for the CPA team
- Speak at a normal pace, not too fast
- Use their name naturally in conversation

If they ask questions you can't answer:
"That's a great question. Our CPA team can cover that in detail during the consultation. They have specific expertise in [their industry]."

End Goal: Either schedule meeting or get permission to send email follow-up.`,

    voice: 'maya', // Professional female voice (alternatives: 'ryan', 'emily')
    max_duration: 5, // 5 minutes max
    temperature: 0.7, // Balance between natural and consistent

    // Webhook to receive call results
    webhook: process.env.BLAND_WEBHOOK_URL || null,

    // Transfer options
    transfer_phone_number: process.env.TRANSFER_PHONE_NUMBER || null,
    transfer_list: {
      default: {
        number: process.env.TRANSFER_PHONE_NUMBER || null,
        message: "Let me transfer you to our head CPA who can help you right away."
      }
    }
  };
}

/**
 * Make AI call using Bland.ai
 */
async function makeCall(phoneNumber, lead) {
  try {
    const callConfig = createCallScript(lead);

    const response = await axios.post(
      `${BLAND_API_URL}/calls`,
      {
        phone_number: phoneNumber,
        from: process.env.BLAND_PHONE_NUMBER || null, // Your Bland.ai phone number
        ...callConfig,
        metadata: {
          lead_id: lead.id,
          company: lead.company,
          source: 'lead_scraping'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.BLAND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      callId: response.data.call_id,
      status: response.data.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Get call status and transcript
 */
async function getCallStatus(callId) {
  try {
    const response = await axios.get(
      `${BLAND_API_URL}/calls/${callId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BLAND_API_KEY}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error(`Error fetching call status: ${error.message}`);
    return null;
  }
}

/**
 * Save call results
 */
function saveResults(results, csvFilePath) {
  const timestamp = new Date().toISOString().split('T')[0];
  const basename = path.basename(csvFilePath, '.csv');
  const filename = `${basename}-calls-${timestamp}.json`;
  const filepath = path.join(__dirname, '..', 'data', 'calls', filename);

  // Ensure directory exists
  const callsDir = path.join(__dirname, '..', 'data', 'calls');
  if (!fs.existsSync(callsDir)) {
    fs.mkdirSync(callsDir, { recursive: true });
  }

  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  return filepath;
}

/**
 * Display campaign summary
 */
function displaySummary(results) {
  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = total - successful;

  console.log('\n' + '='.repeat(50));
  console.log('📊 CALLING CAMPAIGN SUMMARY');
  console.log('='.repeat(50));
  console.log(`  Total Calls Attempted: ${total}`);
  console.log(`  Successful Calls:      ${successful} (${Math.round(successful / total * 100)}%)`);
  console.log(`  Failed Calls:          ${failed}`);
  console.log('='.repeat(50) + '\n');
}

// Main execution
(async () => {
  try {
    console.log('⚠️  IMPORTANT: AI calling requires phone numbers.');
    console.log('This script demonstrates the Bland.ai integration.\n');
    console.log('To use this in production:');
    console.log('1. Add phone number scraping to scrape-leads.js');
    console.log('2. Set up your Bland.ai account and phone number');
    console.log('3. Configure environment variables');
    console.log('4. Ensure compliance with TCPA regulations\n');

    const leads = parseCSV(csvFilePath);
    console.log(`✅ Loaded ${leads.length} leads\n`);

    // Show first lead as example
    if (leads.length > 0) {
      console.log('📋 Example Lead:');
      console.log(`   Company: ${leads[0].company}`);
      console.log(`   Contact: ${leads[0].first_name} ${leads[0].last_name}`);
      console.log(`   Email: ${leads[0].email || 'N/A'}`);
      console.log('\n📞 Example Call Script:');
      const exampleScript = createCallScript(leads[0]);
      console.log(exampleScript.prompt.substring(0, 500) + '...\n');
    }

    console.log('💡 To actually make calls:');
    console.log('   1. Ensure BLAND_API_KEY is set in .env');
    console.log('   2. Add phone numbers to your lead CSV');
    console.log('   3. Uncomment the calling code below');
    console.log('   4. Run: node scripts/ai-calling.js <csv-file>\n');

    /*
    // UNCOMMENT THIS CODE TO MAKE ACTUAL CALLS:

    console.log('🚀 Starting calling campaign...\n');
    const results = [];
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      // Skip if no phone number
      if (!lead.phone || lead.phone === '') {
        console.log(`  [${i + 1}/${leads.length}] ${lead.company} - ⚠️  No phone number`);
        results.push({
          lead: lead,
          success: false,
          error: 'No phone number'
        });
        continue;
      }

      process.stdout.write(`  [${i + 1}/${leads.length}] Calling ${lead.company}... `);

      const result = await makeCall(lead.phone, lead);

      if (result.success) {
        console.log(`✅ Call initiated (ID: ${result.callId})`);
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }

      results.push({
        lead: lead,
        ...result,
        timestamp: new Date().toISOString()
      });

      // Rate limiting - wait 5 seconds between calls
      if (i < leads.length - 1) {
        await delay(5000);
      }
    }

    // Save results
    const resultsPath = saveResults(results, csvFilePath);
    console.log(`\n💾 Results saved to: ${resultsPath}`);

    // Display summary
    displaySummary(results);

    console.log('📝 Next steps:');
    console.log('   1. Monitor call status in Bland.ai dashboard');
    console.log('   2. Review transcripts and outcomes');
    console.log('   3. Follow up with interested leads');
    console.log('   4. Update CRM with call results\n');
    */

  } catch (error) {
    console.error('\n❌ Calling campaign failed:', error.message);
    process.exit(1);
  }
})();
