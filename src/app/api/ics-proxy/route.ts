// src/app/api/ics-proxy/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const icsUrl = searchParams.get('url');

  if (!icsUrl) {
    return NextResponse.json({ error: 'ICS URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(icsUrl, {
        headers: {
            // Some ICS providers might require a specific User-Agent
            'User-Agent': 'PageDock/1.0',
        }
    });
    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch ICS data from URL. Status: ${response.status}` }, { status: response.status });
    }

    const icsData = await response.text();
    
    // Set appropriate CORS headers for the client to be able to read the response
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*'); // Or specify your app's domain
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Content-Type', 'text/calendar');


    return new NextResponse(icsData, { status: 200, headers });

  } catch (error) {
    console.error('ICS Proxy Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Error fetching ICS data: ${errorMessage}` }, { status: 500 });
  }
}

// Optional: Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*'); // Or specify your app's domain
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return new NextResponse(null, { status: 204, headers });
}
