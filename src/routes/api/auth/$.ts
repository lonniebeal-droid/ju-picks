// JU PICKS - Batch 4 Auth API Route
// Auth endpoint for Better Auth integration
// Preserves Batch 3 Better Auth implementation

import { getServerSession, signIn, signOut } from '../../../../lib/auth/dev-auth';

export async function GET(request) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Auth check failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action;
    const email = body.email;
    const password = body.password;
    const provider = body.provider;
    
    switch (action) {
      case 'signIn':
        if (provider === 'email') {
          const result = await signIn('email', { email, password });
          if (!result.success) {
            return new Response(JSON.stringify({ success: false, error: result.error }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        break;
      case 'signOut':
        await signOut();
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Auth failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}