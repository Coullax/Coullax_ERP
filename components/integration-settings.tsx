'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Copy, RefreshCw, Trash2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CalendarIntegration, CalendarSubscription } from '@/lib/types/calendar';

interface IntegrationWithCalendar extends CalendarIntegration {
  calendar?: { id: string; name: string; color: string; type: string };
}

interface SubscriptionWithCalendar extends CalendarSubscription {
  calendar?: { id: string; name: string; color: string; type: string };
}

interface IntegrationSettingsProps {
  integrations: IntegrationWithCalendar[];
  subscriptions: SubscriptionWithCalendar[];
  calendars: any[];
  onConnectGoogle: (calendarId: string) => void;
  onDisconnectGoogle: (integrationId: string) => void;
  onCreateSubscription: (calendarId: string) => void;
  onSyncNow: (integrationId: string) => void;
}

export function IntegrationSettings({
  integrations,
  subscriptions,
  calendars,
  onConnectGoogle,
  onDisconnectGoogle,
  onCreateSubscription,
  onSyncNow,
}: IntegrationSettingsProps) {
  const [syncing, setSyncing] = useState<string | null>(null);

  const handleSync = async (integrationId: string) => {
    setSyncing(integrationId);
    try {
      await onSyncNow(integrationId);
      toast.success('Calendar synced successfully');
    } catch (error) {
      toast.error('Failed to sync calendar');
    } finally {
      setSyncing(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Google Calendar Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Google Calendar Integration
          </CardTitle>
          <CardDescription>
            Sync your calendars with Google Calendar for seamless two-way synchronization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.filter(i => i.provider === 'google').length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-4">
                No Google Calendar integrations configured
              </p>
              {calendars.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Select a calendar to connect:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {calendars.map(calendar => (
                      <Button
                        key={calendar.id}
                        variant="outline"
                        onClick={() => onConnectGoogle(calendar.id)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Connect {calendar.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {integrations
                .filter(i => i.provider === 'google')
                .map(integration => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            integration.calendar?.color || '#3B82F6',
                        }}
                      />
                      <div>
                        <p className="font-medium">
                          {integration.calendar?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {integration.external_account_email}
                        </p>
                        {integration.last_sync_at && (
                          <p className="text-xs text-gray-400">
                            Last synced:{' '}
                            {new Date(integration.last_sync_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={integration.sync_enabled ? 'default' : 'secondary'}
                      >
                        {integration.sync_enabled ? 'Active' : 'Paused'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSync(integration.id)}
                        disabled={syncing === integration.id}
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${
                            syncing === integration.id ? 'animate-spin' : ''
                          }`}
                        />
                        Sync Now
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDisconnectGoogle(integration.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apple Calendar Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-700" />
            Apple Calendar Subscription
          </CardTitle>
          <CardDescription>
            Subscribe to your calendars in Apple Calendar (one-way sync from app to Apple)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-4">
                No calendar subscriptions created
              </p>
              {calendars.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Select a calendar to create subscription:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {calendars.map(calendar => (
                      <Button
                        key={calendar.id}
                        variant="outline"
                        onClick={() => onCreateSubscription(calendar.id)}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Subscribe to {calendar.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map(subscription => (
                <div
                  key={subscription.id}
                  className="flex flex-col gap-2 p-3 border rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            subscription.calendar?.color || '#3B82F6',
                        }}
                      />
                      <div>
                        <p className="font-medium">
                          {subscription.calendar?.name}
                        </p>
                        {subscription.last_accessed_at && (
                          <p className="text-xs text-gray-400">
                            Last accessed:{' '}
                            {new Date(subscription.last_accessed_at).toLocaleString()}
                            {' • '}
                            {subscription.access_count} accesses
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={subscription.is_active ? 'default' : 'secondary'}
                    >
                      {subscription.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* Subscription URL */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded flex items-center justify-between gap-2">
                    <code className="text-xs flex-1 overflow-x-auto">
                      {subscription.feed_url}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(subscription.feed_url)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Instructions */}
                  <details className="text-sm text-gray-600">
                    <summary className="cursor-pointer hover:text-gray-900">
                      How to subscribe in Apple Calendar
                    </summary>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                      <li>Open Apple Calendar app</li>
                      <li>Go to File → New Calendar Subscription</li>
                      <li>Paste the URL above</li>
                      <li>Click Subscribe</li>
                      <li>
                        Set refresh frequency (recommended: every 15 minutes)
                      </li>
                    </ol>
                  </details>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
