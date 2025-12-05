import { NextRequest, NextResponse } from 'next/server';
import { syncFromGoogle } from '@/lib/integrations/google-calendar';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { integrationId } = await request.json();

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    // Trigger sync
    const result = await syncFromGoogle(integrationId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error syncing calendar:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

// Endpoint to get sync status
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const integrationId = searchParams.get('integrationId');

  if (!integrationId) {
    return NextResponse.json(
      { error: 'Integration ID is required' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const { data: logs, error } = await supabase
      .from('calendar_sync_logs')
      .select('*')
      .eq('integration_id', integrationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sync logs' },
      { status: 500 }
    );
  }
}
