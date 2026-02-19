// Contact Form & Newsletter Handler - Cloudflare Worker
// Integrates with Brevo CRM and Email

const ALLOWED_ORIGINS = [
  'https://accountingbrains.com',
  'http://accountingbrains.com',
  'https://ashishkdmathpal.github.io',
  'http://localhost:8080',
  'http://localhost:8081',
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCors(request);
    }

    // Only accept POST
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    // Route: /newsletter - Newsletter signup
    if (url.pathname === '/newsletter') {
      return handleNewsletter(request, env);
    }

    // Route: / or /contact - Contact form (default)
    return handleContactForm(request, env);
  },
};

// ============================================
// NEWSLETTER SIGNUP HANDLER
// ============================================
async function handleNewsletter(request, env) {
  try {
    const data = await request.json();

    if (!data.email) {
      return jsonResponse({ error: 'Email is required' }, 400, request);
    }

    // Add to Brevo newsletter list
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        email: data.email,
        attributes: {
          FIRSTNAME: data.firstName || '',
          SOURCE: 'Newsletter Signup',
        },
        listIds: [3], // Newsletter list ID - UPDATE THIS in Brevo
        updateEnabled: true,
      }),
    });

    // Send welcome email (even if contact exists)
    await sendWelcomeEmail(env.BREVO_API_KEY, data.email, data.firstName);

    return jsonResponse({
      success: true,
      message: 'Thanks for subscribing! Check your inbox for a welcome email.'
    }, 200, request);

  } catch (error) {
    console.error('Newsletter signup error:', error);
    return jsonResponse({
      error: 'Something went wrong. Please try again.'
    }, 500, request);
  }
}

// Send welcome email to newsletter subscriber
async function sendWelcomeEmail(apiKey, email, firstName) {
  const name = firstName || 'there';
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { name: 'AccountingBrains', email: 'contact@accountingbrains.com' },
      to: [{ email: email }],
      subject: 'Welcome to the AccountingBrains Newsletter!',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Welcome to AccountingBrains!</h2>
          <p>Hi ${name},</p>
          <p>Thanks for subscribing to our newsletter! You'll receive:</p>
          <ul>
            <li>Tax tips and updates for non-profits</li>
            <li>Financial best practices</li>
            <li>Important compliance deadlines</li>
            <li>Exclusive insights from our CPA team</li>
          </ul>
          <p>In the meantime, check out our latest resources:</p>
          <p><a href="https://accountingbrains.com/blog/" style="color: #1e40af;">Visit our Blog</a></p>
          <p>Best regards,<br><strong>The AccountingBrains Team</strong></p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #6b7280;">
            You're receiving this because you signed up at AccountingBrains.
          </p>
        </div>
      `,
    }),
  });
}

// ============================================
// CONTACT FORM HANDLER
// ============================================
async function handleContactForm(request, env) {
  try {
    const formData = await request.json();

    // Validate required fields
    const required = ['firstName', 'lastName', 'email', 'service', 'message'];
    for (const field of required) {
      if (!formData[field]) {
        return jsonResponse({ error: `Missing required field: ${field}` }, 400, request);
      }
    }

    // 1. Add contact to Brevo CRM
    await addToBrevo(env.BREVO_API_KEY, formData);

    // 2. Send notification email to admin
    await sendNotificationEmail(env.BREVO_API_KEY, env.ADMIN_EMAIL, formData);

    // 3. Send confirmation email to user
    await sendConfirmationEmail(env.BREVO_API_KEY, formData);

    return jsonResponse({
      success: true,
      message: 'Thank you! We\'ll be in touch within 24 hours.'
    }, 200, request);

  } catch (error) {
    console.error('Form submission error:', error);
    return jsonResponse({
      error: 'Something went wrong. Please try again or email us directly.'
    }, 500, request);
  }
}

// Add contact to Brevo CRM
async function addToBrevo(apiKey, data) {
  const response = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      email: data.email,
      attributes: {
        FIRSTNAME: data.firstName,
        LASTNAME: data.lastName,
        PHONE: data.phone || '',
        ORGANIZATION: data.organization || '',
        ORG_TYPE: data.orgType || '',
        SERVICE_INTEREST: data.service,
        MESSAGE: data.message,
        SOURCE: 'Website Contact Form',
      },
      listIds: [2], // Contact form list ID - UPDATE THIS in Brevo
      updateEnabled: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Brevo contact error:', error);
  }

  return response;
}

// Send notification email to admin
async function sendNotificationEmail(apiKey, adminEmail, data) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { name: 'AccountingBrains Website', email: 'noreply@accountingbrains.com' },
      to: [{ email: adminEmail }],
      subject: `New Contact Form: ${data.firstName} ${data.lastName} - ${data.service}`,
      htmlContent: `
        <h2>New Contact Form Submission</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Name</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.firstName} ${data.lastName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td><td style="padding: 8px; border: 1px solid #ddd;"><a href="mailto:${data.email}">${data.email}</a></td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.phone || 'Not provided'}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Organization</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.organization || 'Not provided'}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Org Type</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.orgType || 'Not provided'}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Service</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.service}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Message</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.message}</td></tr>
        </table>
        <p style="margin-top: 20px;"><a href="mailto:${data.email}?subject=Re: Your inquiry to AccountingBrains">Reply to ${data.firstName}</a></p>
      `,
    }),
  });

  if (!response.ok) {
    console.error('Failed to send admin notification:', await response.text());
  }

  return response;
}

// Send confirmation email to user
async function sendConfirmationEmail(apiKey, data) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { name: 'AccountingBrains', email: 'contact@accountingbrains.com' },
      to: [{ email: data.email, name: `${data.firstName} ${data.lastName}` }],
      subject: 'We received your message - AccountingBrains',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Thank you for contacting AccountingBrains!</h2>
          <p>Hi ${data.firstName},</p>
          <p>We've received your inquiry about <strong>${data.service}</strong> and will get back to you within 24 hours.</p>
          <p>In the meantime, here's a summary of your message:</p>
          <blockquote style="background: #f3f4f6; padding: 15px; border-left: 4px solid #1e40af; margin: 20px 0;">
            ${data.message}
          </blockquote>
          <p>If you have any urgent questions, feel free to reply to this email.</p>
          <p>Best regards,<br><strong>The AccountingBrains Team</strong></p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #6b7280;">
            AccountingBrains - Expert CPA Services for Non-Profits<br>
            <a href="https://accountingbrains.com/">Visit our website</a>
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    console.error('Failed to send confirmation email:', await response.text());
  }

  return response;
}

// ============================================
// HELPERS
// ============================================

// CORS handler
function handleCors(request) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// JSON response helper
function jsonResponse(data, status, request = null) {
  const origin = request?.headers?.get('Origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
    },
  });
}
