# Google Calendar Integration - Debug Guide

## Current Status
The Google Calendar integration has been implemented with comprehensive debugging. Here's what to check:

## Step 1: Check Console Logs
Open your browser to `http://localhost:8082` and check the console (F12) for these messages:

### Expected Console Output:
```
=== App Component Mounted ===
=== Google Configuration Debug ===
Client ID exists: false
Client ID is placeholder: true
API Key exists: false
API Key is placeholder: true
Window.gapi exists: true
==================================
Initializing Google API...
❌ Google Client ID not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file or update config/google.js
```

## Step 2: Configure Google Client ID

### Option A: Environment Variables (Recommended)
Create a `.env` file in the project root:
```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_API_KEY=your_api_key_here
```

### Option B: Direct Configuration
Edit `config/google.js` and replace:
```javascript
clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE',
```
with:
```javascript
clientId: 'your_actual_client_id_here.apps.googleusercontent.com',
```

## Step 3: Google Cloud Console Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create/Select Project**: Create a new project or select existing
3. **Enable Google Calendar API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - **IMPORTANT**: Add these authorized origins:
     - `http://localhost:8082` (for Expo web development)
     - `http://localhost:3000` (backup)
   - Copy the Client ID

## Step 4: Test the Integration

After configuring the Client ID:

1. **Restart the server**: Stop and restart `npm run web`
2. **Check console**: Should see "✅ Google API initialized successfully"
3. **Click "Connect Google Calendar"**: Should open Google sign-in popup
4. **Sign in**: Grant calendar permissions
5. **Check events**: Google Calendar events should appear in blue

## Common Issues & Solutions

### Issue: "Google Client ID not configured"
**Solution**: Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env file or update config/google.js

### Issue: "Google API script not loaded"
**Solution**: Check that app.json has the Google API script loaded (it should)

### Issue: "invalid_client" error
**Solution**: 
- Verify Client ID is correct
- Ensure `http://localhost:8082` is in authorized origins
- Check that the Client ID ends with `.apps.googleusercontent.com`

### Issue: "idpiframe_initialization_failed"
**Solution**: 
- Check internet connection
- Try in incognito/private browsing mode
- Clear browser cache

### Issue: CORS errors
**Solution**: Ensure the domain is added to authorized origins in Google Cloud Console

## Debug Commands

### Check if gapi is loaded:
```javascript
console.log('gapi loaded:', Boolean(window.gapi));
```

### Check auth instance:
```javascript
console.log('auth2 available:', Boolean(window.gapi?.auth2));
```

### Check current user:
```javascript
if (window.gapi?.auth2) {
  const authInstance = window.gapi.auth2.getAuthInstance();
  console.log('Signed in:', authInstance.isSignedIn.get());
}
```

## Expected Behavior After Setup

1. **App loads**: Shows "📅 Connect Google Calendar" button
2. **Click button**: Opens Google sign-in popup
3. **Sign in**: User grants calendar permissions
4. **Success**: Button changes to "📅 Disconnect Google"
5. **Events appear**: Google Calendar events show in blue on calendar
6. **Event details**: Click any date to see Google events with blue badges

## Next Steps

Once working:
1. Test with real Google Calendar events
2. Verify events appear alongside Canvas assignments
3. Test the disconnect functionality
4. Test event refresh functionality

## Support

If issues persist:
1. Check browser console for detailed error messages
2. Verify Google Cloud Console configuration
3. Test with a simple Google Calendar event
4. Check network tab for failed API calls

