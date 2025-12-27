/**
 * AccountingBrains Newsletter Worker
 * Cloudflare Worker that handles newsletter subscriptions via Brevo
 *
 * Environment Variables Required:
 * - BREVO_API_KEY: Your Brevo API key
 *
 * Deploy to Cloudflare Workers:
 * 1. Install Wrangler CLI: npm install -g wrangler
 * 2. Login: wrangler login
 * 3. Create wrangler.toml with your settings
 * 4. Add secrets: wrangler secret put BREVO_API_KEY
 * 5. Deploy: wrangler deploy
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Brevo Newsletter List ID - Update this with your list ID
const NEWSLETTER_LIST_ID = 3;

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    try {
      const data = await request.json();

      // Validate required fields
      if (!data.email) {
        return new Response(JSON.stringify({ error: 'Email is required' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return new Response(JSON.stringify({ error: 'Invalid email format' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Add contact to Brevo newsletter list
      const response = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'api-key': env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          attributes: {
            FIRSTNAME: data.name ? data.name.split(' ')[0] : '',
            LASTNAME: data.name ? data.name.split(' ').slice(1).join(' ') : '',
            SOURCE: data.source || 'newsletter',
            SUBSCRIBED_AT: new Date().toISOString(),
          },
          listIds: [NEWSLETTER_LIST_ID],
          updateEnabled: true,
        }),
      });

      const result = await response.json();

      // Handle duplicate contact (already subscribed)
      if (response.status === 400 && result.code === 'duplicate_parameter') {
        // Try to update the existing contact's list membership
        const updateResponse = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(data.email)}`, {
          method: 'PUT',
          headers: {
            'api-key': env.BREVO_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            listIds: [NEWSLETTER_LIST_ID],
          }),
        });

        if (updateResponse.ok) {
          return new Response(JSON.stringify({ success: true, message: 'Already subscribed - updated preferences' }), {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
      }

      if (!response.ok && response.status !== 201) {
        console.error('Brevo API error:', result);
        return new Response(JSON.stringify({ error: 'Subscription failed. Please try again.' }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Send welcome email (optional - can be handled by Brevo automation)
      // Uncomment if you want to send immediate welcome email
      /*
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: 1, // Your Brevo welcome email template ID
          to: [{ email: data.email, name: data.name || '' }],
        }),
      });
      */

      return new Response(JSON.stringify({ success: true, message: 'Successfully subscribed!' }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Newsletter subscription error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};
