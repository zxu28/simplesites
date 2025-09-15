# Google Calendar Setup Guide - Expo Auth Session

This guide will help you set up Google Calendar integration using `expo-auth-session` for the StudyCalendar app.

## Prerequisites

- Google Cloud Console account
- Expo development environment
- StudyCalendar app running

## Step 1: Google Cloud Console Setup

### 1.1 Create or Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 1.2 Enable Google Calendar API
1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

### 1.3 Create OAuth 2.0 Credentials

You need to create **three separate OAuth 2.0 credentials**:

#### Web Application (for Expo Web)
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Select "Web application"
4. Name: "StudyCalendar Web"
5. Add authorized JavaScript origins:
   - `http://localhost:8082` (for Expo web development)
   - `https://your-domain.com` (if you deploy to web)
6. Click "Create"
7. **Copy the Client ID** - this is your `EXPO_PUBLIC_GOOGLE_CLIENT_ID`

#### iOS Application
1. Click "Create Credentials" > "OAuth 2.0 Client IDs"
2. Select "iOS"
3. Name: "StudyCalendar iOS"
4. Bundle ID: `com.studycalendar.app` (must match app.json)
5. Click "Create"
6. **Copy the Client ID** - this is your `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS`

#### Android Application
1. Click "Create Credentials" > "OAuth 2.0 Client IDs"
2. Select "Android"
3. Name: "StudyCalendar Android"
4. Package name: `com.studycalendar.app` (must match app.json)
5. SHA-1 certificate fingerprint: (get this from your keystore)
6. Click "Create"
7. **Copy the Client ID** - this is your `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID`

## Step 2: Environment Variables Setup

### 2.1 Create .env File
Create a `.env` file in your StudyCalendar project root:

```bash
# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_web_client_id_here
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your_ios_client_id_here
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your_android_client_id_here
```

### 2.2 Replace Placeholder Values
Replace the placeholder values with your actual Client IDs from Step 1.3.

## Step 3: App Configuration

### 3.1 Bundle Identifiers
The app.json is already configured with:
- iOS Bundle ID: `com.studycalendar.app`
- Android Package: `com.studycalendar.app`

These must match the bundle identifiers you used when creating OAuth credentials.

### 3.2 OAuth Scopes
The app requests the following scope:
- `https://www.googleapis.com/auth/calendar.readonly`

This allows the app to read your Google Calendar events.

## Step 4: Testing the Integration

### 4.1 Start the App
```bash
cd StudyCalendar
npm run web
```

### 4.2 Test Authentication
1. Open http://localhost:8082 in your browser
2. Click "📅 Connect Google Calendar"
3. You should be redirected to Google's OAuth consent screen
4. Grant permissions to access your calendar
5. You should be redirected back to the app

### 4.3 Verify Events
1. After successful authentication, click "🔄 Refresh Google Calendar"
2. Your Google Calendar events should appear on the calendar
3. Events are marked with blue dots and "Google Event" badges

## Step 5: Troubleshooting

### Common Issues

#### "Client ID not configured" Error
- Check that your `.env` file exists and contains the correct Client IDs
- Ensure environment variable names start with `EXPO_PUBLIC_`
- Restart the Expo development server after changing `.env`

#### "Token expired or invalid" Error
- The access token has expired (they typically last 1 hour)
- Click "📅 Connect Google Calendar" again to refresh the token

#### "Google Calendar API not enabled" Error
- Go to Google Cloud Console > APIs & Services > Library
- Search for "Google Calendar API" and enable it

#### "Authentication failed" Error
- Check that your OAuth credentials are correctly configured
- Verify bundle identifiers match between app.json and Google Cloud Console
- Ensure authorized origins include `http://localhost:8082`

#### No Events Showing
- Check browser console for error messages
- Verify you have events in your Google Calendar
- Try refreshing the calendar data

### Debug Information
The app logs detailed information to the browser console:
- Configuration validation
- OAuth flow status
- API request/response details
- Error messages with specific details

## Step 6: Production Deployment

### 6.1 Web Deployment
When deploying to production:
1. Add your production domain to authorized JavaScript origins
2. Update environment variables with production Client IDs
3. Test the OAuth flow on your production domain

### 6.2 Mobile App Store Deployment
For iOS and Android app store releases:
1. Use the iOS and Android Client IDs you created
2. Ensure bundle identifiers match your app store listings
3. Test OAuth flow on physical devices

## Security Notes

- Never commit your `.env` file to version control
- Client IDs are safe to expose (they're meant to be public)
- Access tokens are automatically managed by expo-auth-session
- The app only requests read-only access to your calendar

## Support

If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify your Google Cloud Console configuration
3. Ensure all environment variables are set correctly
4. Test with a fresh OAuth flow (sign out and sign in again)

