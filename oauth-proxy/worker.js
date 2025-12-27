// Cloudflare Worker - GitHub OAuth Proxy for Decap CMS
// Deploy this to Cloudflare Workers and set environment variables:
// - GITHUB_CLIENT_ID
// - GITHUB_CLIENT_SECRET

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Route: /auth - Redirect to GitHub OAuth
    if (url.pathname === '/auth') {
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri: `${url.origin}/callback`,
        scope: 'repo,user',
        state: crypto.randomUUID(),
      });
      return Response.redirect(`${GITHUB_AUTHORIZE_URL}?${params}`, 302);
    }

    // Route: /callback - Handle OAuth callback from GitHub
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');

      if (!code) {
        return new Response('Missing code parameter', { status: 400 });
      }

      try {
        // Exchange code for access token
        const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code: code,
          }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
          return new Response(`OAuth error: ${tokenData.error_description}`, { status: 400 });
        }

        // Return HTML that posts the token back to the parent window (Decap CMS)
        const html = `
<!DOCTYPE html>
<html>
<head>
  <title>OAuth Complete</title>
</head>
<body>
  <script>
    (function() {
      const token = ${JSON.stringify(tokenData.access_token)};
      const provider = 'github';

      // Post message to parent window
      if (window.opener) {
        window.opener.postMessage(
          'authorization:' + provider + ':success:' + JSON.stringify({ token: token, provider: provider }),
          '*'
        );
        window.close();
      }
    })();
  </script>
  <p>Authentication successful! This window should close automatically.</p>
</body>
</html>`;

        return new Response(html, {
          headers: { 'Content-Type': 'text/html' },
        });

      } catch (error) {
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
    }

    // Default response
    return new Response('GitHub OAuth Proxy for Decap CMS', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
