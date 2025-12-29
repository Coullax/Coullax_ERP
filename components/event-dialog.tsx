'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { Calendar, CreateEventInput } from '@/lib/types/calendar';
import { format, parseISO } from 'date-fns';
import { isHoliday, getHolidayName } from '@/lib/holiday-utils';
import { toast } from 'sonner';

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars: Calendar[];
  defaultDate?: Date;
  onSave: (event: CreateEventInput) => Promise<void>;
}

export function EventDialog({
  open,
  onOpenChange,
  calendars,
  defaultDate,
  onSave,
}: EventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isStartDateHoliday, setIsStartDateHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<CreateEventInput>>({
    calendar_id: calendars.find(c => c.is_default)?.id || calendars[0]?.id || '',
    title: '',
    description: '',
    location: '',
    start_time: defaultDate
      ? format(defaultDate, "yyyy-MM-dd'T'HH:mm")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_time: defaultDate
      ? format(new Date(defaultDate.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm")
      : format(new Date(Date.now() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
    is_all_day: false,
    visibility: 'internal',
  });

  // Check if start date is a holiday
  useEffect(() => {
    const checkHoliday = async () => {
      if (formData.start_time) {
        const startDate = parseISO(formData.start_time);
        const isHol = await isHoliday(startDate);
        setIsStartDateHoliday(isHol);

        if (isHol) {
          const name = await getHolidayName(startDate);
          setHolidayName(name);
        } else {
          setHolidayName(null);
        }
      }
    };

    checkHoliday();
  }, [formData.start_time]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.calendar_id || !formData.start_time || !formData.end_time) {
      return;
    }

    // Prevent creating non-holiday/non-poya events on holiday/poya dates
    if (isStartDateHoliday && formData.event_type !== 'holiday' && formData.event_type !== 'poya') {
      toast.error(`Cannot create events on ${holidayName || 'a holiday'}. Please select a different date.`);
      return;
    }

    setLoading(true);
    try {
      await onSave(formData as CreateEventInput);
      onOpenChange(false);
      // Reset form
      setFormData({
        calendar_id: calendars.find(c => c.is_default)?.id || calendars[0]?.id,
        title: '',
        description: '',
        location: '',
        start_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        end_time: format(new Date(Date.now() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
        is_all_day: false,
        visibility: 'internal',
      });
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Event title"
              required
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Holiday Warning */}
          {isStartDateHoliday && formData.event_type !== 'holiday' && formData.event_type !== 'poya' && (
            <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                ⚠️ Warning: {holidayName || 'This date is a holiday'}
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                You cannot create regular events on holiday dates. Please select a different date or change the event type to "Holiday" or "Poya Day".
              </p>
            </div>
          )}

          {/* All Day */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="all_day"
              checked={formData.is_all_day}
              onCheckedChange={checked =>
                setFormData(prev => ({ ...prev, is_all_day: checked as boolean }))
              }
            />
            <Label htmlFor="all_day" className="cursor-pointer">
              All day event
            </Label>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Add location"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add description"
              rows={3}
            />
          </div>

          {/* Event Type */}
          <div>
            <Label htmlFor="event_type">Event Type</Label>
            <Select
              value={formData.event_type || 'other'}
              onValueChange={(value) => {
                const newFormData = { ...formData, event_type: value as any };
                // Auto-enable all-day for holidays and poya days
                if (value === 'holiday' || value === 'poya') {
                  newFormData.is_all_day = true;
                }
                setFormData(prev => ({ ...prev, ...newFormData }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="holiday">Holiday</SelectItem>
                <SelectItem value="poya">Poya Day</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {formData.event_type === 'holiday' && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ Holidays will be visible to all employees and will block attendance marking and request submissions for these dates.
              </p>
            )}
            {formData.event_type === 'poya' && (
              <p className="text-xs text-purple-600 mt-1">
                🌙 Poya days will be visible to all employees as special observance days.
              </p>
            )}
          </div>

          {/* Visibility */}
          <div>
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              value={formData.visibility}
              onValueChange={value =>
                setFormData(prev => ({ ...prev, visibility: value as any }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
