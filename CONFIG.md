# Study Calendar - Configuration Guide

## Environment Setup

### Development Environment
- Node.js 14+
- npm or yarn
- Expo CLI
- Expo Go app (mobile testing)

### Production Environment
- Expo Application Services (EAS)
- App Store Connect (iOS)
- Google Play Console (Android)

## Configuration Files

### app.json
Main Expo configuration file containing:
- App metadata (name, version, icon)
- Platform-specific settings
- Build configurations
- Plugin configurations

### package.json
Dependencies and scripts:
- React Native and Expo dependencies
- Development scripts
- Build commands

## Environment Variables

Create a `.env` file for sensitive configuration:

```bash
# Canvas LMS Configuration
CANVAS_API_URL=https://your-school.instructure.com
CANVAS_API_TOKEN=your_api_token_here

# Study Preferences
DEFAULT_STUDY_TIME=19:00
DEFAULT_STUDY_DURATION=1 hour
STUDY_DAYS_BEFORE_ASSIGNMENT=1

# App Configuration
APP_VERSION=1.0.0
DEBUG_MODE=false
```

## Build Configuration

### EAS Build
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure EAS
eas build:configure

# Build for production
eas build --platform all
```

### Local Build
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## Deployment

### App Stores
1. Configure app.json with correct bundle identifiers
2. Build with EAS Build
3. Submit to App Store Connect / Google Play Console

### Web Deployment
1. Build web version: `npm run web`
2. Deploy to Vercel, Netlify, or similar platform

## Customization

### Colors and Themes
Edit `constants/colors.js` to customize:
- Primary colors
- Assignment colors
- Study block colors
- Calendar theme

### Study Scheduling
Modify `utils/studyScheduler.js` to adjust:
- Study time preferences
- Duration settings
- Scheduling algorithms

### ICS Integration
Update `utils/icsParser.js` for:
- Different calendar formats
- Custom field mappings
- Error handling
