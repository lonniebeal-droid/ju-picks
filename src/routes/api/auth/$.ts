// JU PICKS - Batch 4 Auth API Route
// Auth endpoint for Better Auth integration
// Preserves Batch 3 Better Auth implementation

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, signIn, signOut } from '../../../../lib/auth/dev-auth';

interface Session {
  userId: string;
  email?: string;
  role?: string;
}

interface AuthResponse {
  authenticated: boolean;
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  error?: string;
}

interface SignInRequest {
  action: string;
  email?: string;
  password?: string;
  provider?: string;
}

/**
 * GET /api/auth - Check authentication status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession() as Session | null;
    
    if (!session) {
      return NextResponse.json(
        { authenticated: false } as AuthResponse,
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: session.userId,
          email: session.email,
          role: session.role,
        },
      } as AuthResponse,
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Auth check failed' } as AuthResponse,
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth - Handle authentication actions
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: SignInRequest = await request.json();
    const action = body.action;
    const email = body.email;
    const password = body.password;
    const provider = body.provider;
    
    switch (action) {
      case 'signIn':
        if (provider === 'email' && email && password) {
          const result = await signIn('email', { email, password });
          if (!result.success) {
            return NextResponse.json(
              { success: false, error: result.error } as AuthResponse,
              { status: 401 }
            );
          }
          return NextResponse.json(
            { success: true } as AuthResponse,
            { status: 200 }
          );
        }
        break;
      case 'signOut':
        await signOut();
        return NextResponse.json(
          { success: true } as AuthResponse,
          { status: 200 }
        );
      default:
        return NextResponse.json(
          { error: 'Invalid action' } as AuthResponse,
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Auth failed' } as AuthResponse,
      { status: 500 }
    );
  }
  
  // Default response if no action matched
  return NextResponse.json(
    { error: 'No action specified' } as AuthResponse,
    { status: 400 }
  );
}