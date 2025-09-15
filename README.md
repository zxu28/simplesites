# Study Calendar - Google Calendar Integration

A React Native (Expo) app that allows any user to log in with their own Google account and view their Google Calendar events alongside manual assignments.

## Features

### 📅 Calendar View
- Interactive calendar with visual indicators
- Color-coded events (Google Calendar events in blue, manual assignments in red)
- Tap any date to view events for that day

### 📚 Event Management
- **Google Calendar Integration**: Any user can log in with their own Google account
- Fetches events from the user's Google Calendar API
- Displays Google Calendar events with full details (title, time, location, description)
- Allows manual addition of custom assignments

### 🔐 Authentication
- OAuth2 authentication using expo-auth-session (works on web, iOS, and Android)
- Secure token-based access to Google Calendar API
- Automatic token management and refresh
- Easy login/logout flow

### 🎨 Clean UI
- Modern, intuitive design
- Color-coded event types
- Responsive layout for mobile devices
- Clear visual distinction between Google events and manual assignments

## Setup Instructions

### Prerequisites
- Node.js (version 14 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- Google Cloud Console account
- Expo Go app on your mobile device (for testing)

### Installation

1. **Install dependencies:**
   ```bash
   cd StudyCalendar
   npm install
   ```

2. **Configure Google Calendar API:**
   - Follow the detailed setup guide in `EXPO_AUTH_SESSION_SETUP.md`
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google Calendar API
   - Create OAuth 2.0 credentials for Web, iOS, Android, and Expo applications
   - Add the redirect URI (shown in console) to authorized redirect URIs
   - Add your domain to authorized JavaScript origins
   - Copy the Client IDs

3. **Set up environment variables:**
   - Create `.env` file in the project root
   - Add:
     ```
     EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your_web_client_id_here
     EXPO_PUBLIC_GOOGLE_CLIENT_ID_EXPO=your_expo_client_id_here
     EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your_ios_client_id_here
     EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your_android_client_id_here
     ```

4. **Start the development server:**
   ```bash
   npm start
   ```

5. **Run the app:**
   - Run `npm start` to start the Expo development server
   - Or run `npx expo start --web` for web version directly
   - Scan the QR code with Expo Go app (iOS/Android)
   - Or run `npm run ios` / `npm run android` for simulators
   - Or run `npm run web` for web version

## How It Works

### Google Calendar Integration
- Uses Google Calendar API to fetch events
- OAuth2 authentication for secure access
- Fetches events for the next 90 days
- Displays all Google Calendar events with full details

### Manual Assignment Management
- Users can add custom assignments manually
- Assignments are stored locally and displayed alongside Google Calendar events
- Manual assignments appear in red, Google events in blue

### Event Display
- **Google Calendar Events**: Blue indicators, shown on their scheduled dates
- **Manual Assignments**: Red indicators, shown on due dates
- **Selected Date**: Blue highlight for the currently selected date

## Canvas LMS Integration

This app no longer fetches directly from Canvas LMS. Instead:

1. **Sync Canvas to Google Calendar**: Use Canvas's built-in Google Calendar integration
2. **External Sync**: Set up Canvas to automatically sync assignments to your Google Calendar
3. **Unified View**: All events (Canvas assignments + Google Calendar events) appear in one place

### Setting up Canvas → Google Calendar Sync
1. In Canvas, go to Account → Settings → Integrations
2. Connect your Google Calendar account
3. Enable calendar sync for assignments
4. Canvas assignments will now appear in your Google Calendar
5. This app will automatically display them alongside other Google Calendar events

## Customization

### Adding Manual Assignments
Use the "+ Add Assignment" button to create custom assignments that aren't in Google Calendar.

### Styling
All styles are defined in the `styles` object at the bottom of `App.js`. You can customize:
- Colors for different event types
- Calendar theme
- Event card appearance
- Typography

## Project Structure

```
StudyCalendar/
├── App.js                      # Main application component
├── package.json                # Dependencies and scripts
├── app.json                   # Expo configuration
├── config/
│   └── google.js              # Google Calendar configuration
├── GOOGLE_CALENDAR_SETUP.md   # Google Calendar setup guide
├── GOOGLE_CALENDAR_DEBUG.md   # Google Calendar debugging guide
└── README.md                  # This file
```

## Dependencies

- **expo**: Expo framework for React Native
- **expo-auth-session**: OAuth authentication for Expo apps
- **expo-crypto**: Cryptographic utilities for Expo
- **react-native-calendars**: Calendar component library
- **react-native**: React Native framework

## Environment Variables

Create a `.env` file in the project root with:
```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_web_client_id_here
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your_ios_client_id_here
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your_android_client_id_here
```

## Future Enhancements

- Real-time Google Calendar sync
- Event editing capabilities
- Assignment priority levels
- Study session tracking
- Push notifications for upcoming events
- Calendar analytics and insights

## License

MIT License - feel free to use this project as a starting point for your own calendar management app!
