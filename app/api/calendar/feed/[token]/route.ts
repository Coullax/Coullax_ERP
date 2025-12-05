import { NextRequest, NextResponse } from 'next/server';
import { generateCalendarFeed } from '@/lib/integrations/calendar-feed';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  try {
    const icsContent = await generateCalendarFeed(token);

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="calendar.ics"',
        'Cache-Control': 'no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating calendar feed:', error);
    return NextResponse.json(
      { error: 'Invalid or expired subscription token' },
      { status: 404 }
    );
  }
}
