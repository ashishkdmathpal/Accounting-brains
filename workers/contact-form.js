/**
 * AccountingBrains Contact Form Worker
 * Cloudflare Worker that handles contact form submissions and forwards to Brevo
 *
 * Environment Variables Required:
 * - BREVO_API_KEY: Your Brevo API key
 * - NOTIFICATION_EMAIL: Email to receive contact form notifications
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
      if (!data.email || !data.firstName || !data.service || !data.message) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // 1. Add/Update contact in Brevo
      const contactResponse = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'api-key': env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          attributes: {
            FIRSTNAME: data.firstName,
            LASTNAME: data.lastName || '',
            PHONE: data.phone || '',
            ORGANIZATION: data.organization || '',
            ORG_TYPE: data.orgType || '',
            SERVICE_INTEREST: data.service,
            PLAN: data.plan || '',
            MESSAGE: data.message,
            SOURCE: 'contact_form',
          },
          listIds: [2], // Update with your Brevo list ID for contacts
          updateEnabled: true,
        }),
      });

      // 2. Send notification email via Brevo
      const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'AccountingBrains Website', email: 'noreply@accountingbrains.com' },
          to: [{ email: env.NOTIFICATION_EMAIL || 'hello@accountingbrains.com' }],
          subject: `New Contact Form Submission - ${data.service}`,
          htmlContent: `
            <h2>New Contact Form Submission</h2>
            <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Name</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.firstName} ${data.lastName || ''}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td><td style="padding: 8px; border: 1px solid #ddd;"><a href="mailto:${data.email}">${data.email}</a></td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.phone || 'Not provided'}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Organization</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.organization || 'Not provided'}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Organization Type</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.orgType || 'Not provided'}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Service Interest</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.service}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Plan</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.plan || 'Not specified'}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Message</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.message}</td></tr>
            </table>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">Submitted from AccountingBrains website contact form</p>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Email send failed:', await emailResponse.text());
      }

      return new Response(JSON.stringify({ success: true, message: 'Form submitted successfully' }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Contact form error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};
