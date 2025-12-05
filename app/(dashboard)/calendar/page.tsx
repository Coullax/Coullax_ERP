import { Suspense } from 'react';
import { CalendarClient } from './calendar-client';

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading calendar...</div>}>
      <CalendarClient />
    </Suspense>
  );
}
