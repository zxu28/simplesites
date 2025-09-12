# Study Calendar with Google Calendar Integration

A React Native/Expo app that combines Canvas LMS assignments with Google Calendar events for comprehensive study planning.

## Features

- **Canvas LMS Integration**: Automatically fetches assignments and due dates
- **Google Calendar Integration**: Shows your Google Calendar events alongside assignments
- **Study Block Generation**: Automatically creates study blocks for the day before assignments
- **Visual Calendar**: Color-coded events (Red: Assignments, Green: Study Blocks, Blue: Google Events)
- **Manual Assignment Addition**: Add custom assignments directly in the app

## Setup Instructions

### 1. Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized origins:
     - `http://localhost:8082` (for Expo web development)
     - Your production domain (when deploying)
5. Copy the Client ID

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
EXPO_PUBLIC_GOOGLE_API_KEY=your_google_api_key_here
```

**OR** update the configuration directly in `config/google.js`:

```javascript
export const GOOGLE_CONFIG = {
  clientId: 'your_google_client_id_here',
  apiKey: 'your_google_api_key_here', // Optional
  // ... rest of config
};
```

### 3. Canvas LMS Configuration

Update `config/canvas.js` with your Canvas instance details:

```javascript
export const CANVAS_CONFIG = {
  domain: 'your-school.instructure.com', // Your school's Canvas domain
  apiToken: 'your_canvas_api_token_here',
  baseUrl: 'https://your-school.instructure.com/api/v1',
  // ... rest of config
};
```

### 4. Installation and Running

```bash
# Install dependencies
npm install

# Start the development server
npm run web
# OR
npx expo start --web
```

The app will be available at `http://localhost:8082`

## Usage

1. **Connect Google Calendar**: Click "📅 Connect Google Calendar" to sign in and authorize calendar access
2. **Refresh Canvas**: Click "🔄 Refresh Canvas" to fetch latest assignments
3. **Add Assignments**: Click "+ Add Assignment" to manually add assignments
4. **View Events**: Select any date to see all events (assignments, study blocks, and Google Calendar events)

## Event Types

- **🔴 Assignments**: Canvas LMS assignments and due dates
- **🟢 Study Blocks**: Automatically generated study sessions (day before assignments)
- **🔵 Google Events**: Events from your Google Calendar

## Troubleshooting

### Google Calendar Issues
- **"Google API not initialized"**: Make sure the Google API script is loaded (check browser console)
- **"Failed to connect"**: Verify your Client ID is correct and the domain is authorized
- **CORS errors**: Ensure your domain is added to authorized origins in Google Cloud Console

### Canvas Issues
- **"Failed to load Canvas events"**: Check your Canvas API token and domain configuration
- **Empty calendar**: Verify your Canvas instance URL and API token permissions

## Development Notes

- Google Calendar events are fetched for the next 90 days
- Study blocks are automatically generated for the day before each assignment
- All events are stored in memory (not persisted)
- The app works offline with cached data

## Security Notes

- API tokens are stored in memory only (not persisted)
- Google OAuth tokens are managed by the Google API client
- No sensitive data is stored locally
- Always use HTTPS in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
