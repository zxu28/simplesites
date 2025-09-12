// Google Calendar Configuration
// IMPORTANT: You need to create OAuth credentials in Google Cloud Console
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project or select existing one
// 3. Enable Google Calendar API
// 4. Create OAuth 2.0 credentials (Web application)
// 5. Add http://localhost:8082 to authorized origins (for Expo web)
// 6. Copy the Client ID and replace the placeholder below

export const GOOGLE_CONFIG = {
  clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE',
  apiKey: process.env.EXPO_PUBLIC_GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE', // Optional
  discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
  scope: 'https://www.googleapis.com/auth/calendar.readonly'
};

// Debug function to check configuration
export const debugGoogleConfig = () => {
  console.log('=== Google Configuration Debug ===');
  console.log('Client ID exists:', Boolean(GOOGLE_CONFIG.clientId));
  console.log('Client ID is placeholder:', GOOGLE_CONFIG.clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE');
  console.log('API Key exists:', Boolean(GOOGLE_CONFIG.apiKey));
  console.log('API Key is placeholder:', GOOGLE_CONFIG.apiKey === 'YOUR_GOOGLE_API_KEY_HERE');
  console.log('Window.gapi exists:', Boolean(typeof window !== 'undefined' && window.gapi));
  console.log('==================================');
};

// Helper function to initialize Google API
export const initializeGoogleAPI = () => {
  return new Promise((resolve, reject) => {
    console.log('Initializing Google API...');
    
    // Debug configuration
    debugGoogleConfig();
    
    // Check if we have a valid client ID
    if (GOOGLE_CONFIG.clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      const error = 'Google Client ID not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file or update config/google.js';
      console.error(error);
      reject(new Error(error));
      return;
    }
    
    // Check if gapi is available
    if (typeof window === 'undefined') {
      const error = 'Window object not available (not in browser environment)';
      console.error(error);
      reject(new Error(error));
      return;
    }
    
    if (!window.gapi) {
      const error = 'Google API script not loaded. Check if https://apis.google.com/js/api.js is loaded in app.json';
      console.error(error);
      reject(new Error(error));
      return;
    }
    
    console.log('Loading Google API client:auth2...');
    window.gapi.load('client:auth2', () => {
      console.log('Google API client:auth2 loaded, initializing...');
      
      const initConfig = {
        clientId: GOOGLE_CONFIG.clientId,
        discoveryDocs: GOOGLE_CONFIG.discoveryDocs,
        scope: GOOGLE_CONFIG.scope
      };
      
      // Only add apiKey if it's not a placeholder
      if (GOOGLE_CONFIG.apiKey && GOOGLE_CONFIG.apiKey !== 'YOUR_GOOGLE_API_KEY_HERE') {
        initConfig.apiKey = GOOGLE_CONFIG.apiKey;
      }
      
      console.log('Initializing with config:', { ...initConfig, clientId: '***' + initConfig.clientId.slice(-10) });
      
      window.gapi.client.init(initConfig).then(() => {
        console.log('✅ Google API initialized successfully');
        console.log('Auth instance available:', Boolean(window.gapi.auth2));
        resolve(window.gapi);
      }).catch((error) => {
        console.error('❌ Google API initialization failed:', error);
        reject(error);
      });
    });
  });
};

// Helper function to sign in to Google
export const signInToGoogle = () => {
  return new Promise((resolve, reject) => {
    console.log('Attempting Google sign-in...');
    
    if (!window.gapi) {
      const error = 'Google API not loaded';
      console.error('❌', error);
      reject(new Error(error));
      return;
    }
    
    if (!window.gapi.auth2) {
      const error = 'Google Auth2 not initialized. Call initializeGoogleAPI() first.';
      console.error('❌', error);
      reject(new Error(error));
      return;
    }
    
    const authInstance = window.gapi.auth2.getAuthInstance();
    if (!authInstance) {
      const error = 'Auth instance not available';
      console.error('❌', error);
      reject(new Error(error));
      return;
    }
    
    console.log('Calling authInstance.signIn()...');
    authInstance.signIn().then((googleUser) => {
      console.log('✅ Google sign-in successful');
      console.log('User email:', googleUser.getBasicProfile().getEmail());
      resolve(googleUser);
    }).catch((error) => {
      console.error('❌ Google sign-in failed:', error);
      console.error('Error details:', error.error, error.details);
      reject(error);
    });
  });
};

// Helper function to sign out of Google
export const signOutOfGoogle = () => {
  return new Promise((resolve, reject) => {
    if (window.gapi && window.gapi.auth2) {
      const authInstance = window.gapi.auth2.getAuthInstance();
      authInstance.signOut().then(() => {
        console.log('Google sign-out successful');
        resolve();
      }).catch(reject);
    } else {
      reject(new Error('Google Auth not initialized'));
    }
  });
};

// Helper function to check if user is signed in
export const isSignedInToGoogle = () => {
  if (window.gapi && window.gapi.auth2) {
    const authInstance = window.gapi.auth2.getAuthInstance();
    return authInstance.isSignedIn.get();
  }
  return false;
};

// Helper function to get Google Calendar events
export const fetchGoogleCalendarEvents = async (timeMin, timeMax) => {
  try {
    const response = await window.gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin,
      timeMax: timeMax,
      showDeleted: false,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100
    });

    return response.result.items || [];
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    throw error;
  }
};
