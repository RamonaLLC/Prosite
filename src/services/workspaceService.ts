// Google Workspace API Services: Calendar, Chat, Meet
// Follows client-side OAuth Bearer token patterns

export interface CalendarEventPayload {
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string; // ISO 8601 string
  endDateTime: string;   // ISO 8601 string
  attendees?: string[];  // emails
  createMeetLink?: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
  hangoutLink?: string; // Google Meet URL
  conferenceData?: {
    entryPoints?: { entryPointType: string; uri: string; label?: string }[];
  };
}

export interface GoogleChatSpace {
  name: string;
  displayName: string;
  type: string;
  spaceType?: string;
}

export interface GoogleChatMessage {
  name?: string;
  text: string;
  sender?: { displayName?: string; name?: string };
  createTime?: string;
}

export interface GoogleMeetRoom {
  meetingUri: string;
  meetingCode?: string;
  spaceName?: string;
}

// -------------------------------------------------------------
// 1. Google Calendar APIs
// -------------------------------------------------------------

export async function fetchCalendarEvents(accessToken: string): Promise<GoogleCalendarEvent[]> {
  try {
    const timeMin = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=20&singleEvents=true&orderBy=startTime`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch Calendar events: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.items || []) as GoogleCalendarEvent[];
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

export async function createCalendarEvent(
  accessToken: string,
  payload: CalendarEventPayload
): Promise<GoogleCalendarEvent> {
  try {
    let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    if (payload.createMeetLink) {
      url += '?conferenceDataVersion=1';
    }

    const body: any = {
      summary: payload.summary,
      description: payload.description || '',
      location: payload.location || '',
      start: {
        dateTime: payload.startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: payload.endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    if (payload.attendees && payload.attendees.length > 0) {
      body.attendees = payload.attendees.map(email => ({ email }));
    }

    if (payload.createMeetLink) {
      body.conferenceData = {
        createRequest: {
          requestId: `prosite-meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create Calendar event: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to delete event: ${response.statusText}`);
  }
}

// -------------------------------------------------------------
// 2. Google Chat APIs
// -------------------------------------------------------------

export async function fetchChatSpaces(accessToken: string): Promise<GoogleChatSpace[]> {
  try {
    const url = 'https://chat.googleapis.com/v1/spaces?pageSize=25';
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to list Chat spaces: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.spaces || []) as GoogleChatSpace[];
  } catch (error: any) {
    console.error('Error fetching chat spaces:', error);
    throw error;
  }
}

export async function sendChatMessage(
  accessToken: string,
  spaceName: string,
  text: string
): Promise<GoogleChatMessage> {
  try {
    const url = `https://chat.googleapis.com/v1/${spaceName}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to post message to Google Chat: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error posting to Google Chat:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// 3. Google Meet APIs
// -------------------------------------------------------------

export async function createGoogleMeetSpace(accessToken: string): Promise<GoogleMeetRoom> {
  try {
    // Attempt Meet v2 Spaces API endpoint first
    const url = 'https://meet.googleapis.com/v2/spaces';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          accessType: 'OPEN',
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        meetingUri: data.meetingUri || `https://meet.google.com/${data.meetingCode || ''}`,
        meetingCode: data.meetingCode,
        spaceName: data.name,
      };
    }

    // Fallback: Create instant Google Calendar event with Hangouts Meet conference
    const now = new Date();
    const endTime = new Date(now.getTime() + 60 * 60 * 1000);
    const event = await createCalendarEvent(accessToken, {
      summary: 'ProSite Live Job Site Video Walkthrough (Google Meet)',
      description: 'Instant site inspection and client collaboration meeting room.',
      startDateTime: now.toISOString(),
      endDateTime: endTime.toISOString(),
      createMeetLink: true,
    });

    const meetLink = event.hangoutLink || 
      event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri || 
      `https://meet.google.com/new`;

    return {
      meetingUri: meetLink,
      meetingCode: meetLink.split('/').pop() || 'live-session',
    };
  } catch (error: any) {
    console.error('Error generating Google Meet room:', error);
    // Return direct instant new meet link fallback
    return {
      meetingUri: 'https://meet.google.com/new',
      meetingCode: 'instant-session',
    };
  }
}
