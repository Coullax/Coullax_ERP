import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, storeGoogleIntegration } from '@/lib/integrations/google-calendar';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth error
  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=missing_params`
    );
  }

  try {
    // Decode state to get user and calendar info
    const { userId, calendarId } = JSON.parse(
      Buffer.from(state, 'base64').toString()
    );

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store integration in database
    await storeGoogleIntegration(userId, calendarId, tokens);

    // Redirect back to calendar page with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/calendar?integration=success`
    );
  } catch (err: any) {
    console.error('Error in Google OAuth callback:', err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=integration_failed`
    );
  }
}
