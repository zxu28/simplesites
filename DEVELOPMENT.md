# Study Calendar - Development Guide

## Project Overview
A React Native (Expo) mobile app for students to manage assignments and study schedules by parsing Canvas LMS calendar feeds.

## Development Setup

### Prerequisites
- Node.js 14+
- npm or yarn
- Expo CLI
- Expo Go app (for mobile testing)

### Installation
```bash
cd StudyCalendar
npm install
```

### Running the App
```bash
# Start development server
npm start

# Run on specific platforms
npm run ios
npm run android
npm run web
```

## Project Structure
```
StudyCalendar/
├── App.js                 # Main application component
├── components/            # Reusable UI components
│   ├── CalendarView.js    # Calendar component
│   ├── EventCard.js       # Event display component
│   └── StudyBlockCard.js  # Study block component
├── utils/                 # Utility functions
│   ├── icsParser.js       # ICS feed parsing logic
│   ├── studyScheduler.js  # Study block generation
│   └── dateHelpers.js     # Date manipulation utilities
├── constants/             # App constants
│   └── colors.js          # Color scheme
├── assets/               # Images and icons
├── package.json          # Dependencies
└── README.md             # Project documentation
```

## Key Features
- Calendar view with event indicators
- ICS/ICAL feed parsing
- Automatic study block generation
- Color-coded event types
- Responsive design

## Future Enhancements
- Real Canvas LMS integration
- User authentication
- Push notifications
- Study analytics
- Custom scheduling options
