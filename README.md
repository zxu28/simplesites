# Study Calendar - React Native App

A simple React Native (Expo) mobile app that helps students manage their assignments and study schedules.

## Features

### 📅 Calendar View
- Interactive calendar with visual indicators
- Color-coded events (assignments in red, study blocks in green)
- Tap any date to view events for that day

### 📚 Assignment Management
- Parses Canvas LMS ICS/ICAL feeds
- Displays assignment due dates
- Shows assignment descriptions and times

### 🎯 Study Block Generation
- Automatically generates 1-hour study blocks
- Places study sessions the day before each assignment due date
- Helps students prepare in advance

### 🎨 Clean UI
- Modern, intuitive design
- Color-coded event types
- Responsive layout for mobile devices

## Setup Instructions

### Prerequisites
- Node.js (version 14 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device (for testing)

### Installation

1. **Install dependencies:**
   ```bash
   cd StudyCalendar
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Run on device:**
   - Scan the QR code with Expo Go app (iOS/Android)
   - Or run `npm run ios` / `npm run android` for simulators
   - Or run `npm run web` for web version

## How It Works

### ICS Feed Parsing
The app includes sample ICS content that simulates Canvas LMS calendar feeds. In a real implementation, you would:

1. Replace `SAMPLE_ICS_URL` with an actual Canvas ICS feed URL
2. Implement proper network requests to fetch the feed
3. Add error handling for network issues

### Study Block Logic
- Scans all assignments from the ICS feed
- For each assignment due date, creates a study block for the previous day
- Study blocks are scheduled at 7:00 PM by default
- Each study block is 1 hour long

### Event Display
- **Assignments**: Red indicators, shown on due dates
- **Study Blocks**: Green indicators, shown the day before assignments
- **Selected Date**: Blue highlight for the currently selected date

## Customization

### Adding Real ICS Feeds
Replace the sample ICS content in `fetchCalendarEvents()` with:
```javascript
const response = await fetch('YOUR_CANVAS_ICS_URL');
const icsContent = await response.text();
```

### Modifying Study Block Schedule
Change the study block timing in the `fetchCalendarEvents()` function:
```javascript
time: '19:00', // Change this to your preferred time
duration: '1 hour', // Modify duration as needed
```

### Styling
All styles are defined in the `styles` object at the bottom of `App.js`. You can customize:
- Colors for assignments and study blocks
- Calendar theme
- Event card appearance
- Typography

## Project Structure

```
StudyCalendar/
├── App.js              # Main application component
├── package.json         # Dependencies and scripts
├── app.json            # Expo configuration
└── README.md           # This file
```

## Dependencies

- **expo**: Expo framework for React Native
- **react-native-calendars**: Calendar component library
- **ical.js**: ICS/ICAL file parser
- **react-native**: React Native framework

## Future Enhancements

- Real Canvas LMS integration
- User authentication
- Custom study block scheduling
- Assignment priority levels
- Study session tracking
- Push notifications for upcoming assignments
- Study time analytics

## License

MIT License - feel free to use this project as a starting point for your own study management app!
