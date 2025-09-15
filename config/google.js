// Google Calendar Configuration for Expo
// IMPORTANT: You need to create OAuth credentials in Google Cloud Console
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project or select existing one
// 3. Enable Google Calendar API
// 4. Create OAuth 2.0 credentials for:
//    - Web application (for Expo web)
//    - iOS application (for iOS builds)
//    - Android application (for Android builds)
// 5. Add the following to authorized origins:
//    - http://localhost:8082 (for Expo web)
//    - Your iOS bundle identifier
//    - Your Android package name
// 6. Copy the Client IDs and set them in your .env file

export const GOOGLE_CONFIG = {
  // Web client ID (for Expo web)
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_WEB_CLIENT_ID_HERE',
  // iOS client ID (for iOS builds)
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || 'YOUR_IOS_CLIENT_ID_HERE',
  // Android client ID (for Android builds)
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || 'YOUR_ANDROID_CLIENT_ID_HERE',
  // Google Calendar API scope
  scope: 'https://www.googleapis.com/auth/calendar.readonly',
  // Google Calendar API base URL
  calendarApiUrl: 'https://www.googleapis.com/calendar/v3'
};

// Debug function to check configuration
export const debugGoogleConfig = () => {
  console.log('=== Google Configuration Debug ===');
  console.log('Web Client ID exists:', Boolean(GOOGLE_CONFIG.webClientId));
  console.log('Web Client ID is placeholder:', GOOGLE_CONFIG.webClientId === 'YOUR_WEB_CLIENT_ID_HERE');
  console.log('iOS Client ID exists:', Boolean(GOOGLE_CONFIG.iosClientId));
  console.log('iOS Client ID is placeholder:', GOOGLE_CONFIG.iosClientId === 'YOUR_IOS_CLIENT_ID_HERE');
  console.log('Android Client ID exists:', Boolean(GOOGLE_CONFIG.androidClientId));
  console.log('Android Client ID is placeholder:', GOOGLE_CONFIG.androidClientId === 'YOUR_ANDROID_CLIENT_ID_HERE');
  console.log('==================================');
};

// Helper function to fetch Google Calendar events using Bearer token
export const fetchGoogleCalendarEvents = async (accessToken, timeMin, timeMax) => {
  try {
    console.log('🔄 Fetching Google Calendar events...');
    console.log('Time range:', { timeMin, timeMax });
    
    const url = `${GOOGLE_CONFIG.calendarApiUrl}/calendars/primary/events`;
    const params = new URLSearchParams({
      timeMin: timeMin,
      timeMax: timeMax,
      showDeleted: 'false',
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100'
    });
    
    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('📡 Google Calendar API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google Calendar API error:', response.status, errorText);
      
      if (response.status === 401) {
        throw new Error('Token expired or invalid. Please sign in again.');
      } else if (response.status === 403) {
        throw new Error('Google Calendar API not enabled. Please enable it in Google Cloud Console.');
      } else {
        throw new Error(`Google Calendar API error: ${response.status} ${errorText}`);
      }
    }
    
    const data = await response.json();
    console.log('✅ Google Calendar events fetched:', data.items?.length || 0, 'events');
    
    return data.items || [];
  } catch (error) {
    console.error('❌ Error fetching Google Calendar events:', error);
    throw error;
  }
};

// Helper function to validate configuration
export const validateGoogleConfig = () => {
  const errors = [];
  
  if (GOOGLE_CONFIG.webClientId === 'YOUR_WEB_CLIENT_ID_HERE') {
    errors.push('Web Client ID not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env');
  }
  
  if (GOOGLE_CONFIG.iosClientId === 'YOUR_IOS_CLIENT_ID_HERE') {
    errors.push('iOS Client ID not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS in .env');
  }
  
  if (GOOGLE_CONFIG.androidClientId === 'YOUR_ANDROID_CLIENT_ID_HERE') {
    errors.push('Android Client ID not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID in .env');
  }
  
  return errors;
};