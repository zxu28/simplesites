# Study Calendar - API Documentation

## Overview
The Study Calendar app integrates with Canvas LMS to fetch assignment data and generate study schedules.

## ICS Feed Integration

### Canvas LMS ICS Feed
Canvas provides ICS feeds for calendar integration:

**URL Format:**
```
https://[your-school].instructure.com/feeds/calendars/user_[user_id].ics
```

**Authentication:**
- Requires Canvas API token
- Add token as query parameter: `?access_token=YOUR_TOKEN`

### Sample ICS Content
```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Canvas LMS//NONSGML v1.0//EN
BEGIN:VEVENT
DTSTART:20241215T235900Z
DTEND:20241216T000000Z
SUMMARY:Math Assignment Due
DESCRIPTION:Complete calculus problem set
LOCATION:Online
END:VEVENT
END:VCALENDAR
```

## API Functions

### parseICSFeed(icsContent)
Parses ICS content and returns array of events.

**Parameters:**
- `icsContent` (string): Raw ICS calendar data

**Returns:**
- Array of event objects with properties:
  - `id`: Unique identifier
  - `title`: Event title
  - `description`: Event description
  - `startDate`: Start date/time
  - `endDate`: End date/time
  - `location`: Event location
  - `type`: Event type (default: 'assignment')

### fetchICSFromURL(url)
Fetches ICS content from URL and parses it.

**Parameters:**
- `url` (string): ICS feed URL

**Returns:**
- Promise resolving to array of events

**Error Handling:**
- Network errors
- Invalid ICS format
- HTTP status errors

### generateStudyBlocks(assignments, options)
Generates study blocks for assignments.

**Parameters:**
- `assignments` (array): Array of assignment events
- `options` (object): Configuration options
  - `studyTime` (string): Default study time (default: '19:00')
  - `duration` (string): Study duration (default: '1 hour')
  - `daysBefore` (number): Days before assignment (default: 1)

**Returns:**
- Object with date keys and study block arrays

## Study Scheduling Algorithms

### Basic Scheduling
- Places 1-hour study blocks the day before each assignment
- Default time: 7:00 PM
- No conflict resolution

### Advanced Scheduling
- Multiple time slots per day
- Conflict avoidance
- Daily study hour limits
- Priority-based scheduling

### Optimized Scheduling
- Considers assignment difficulty
- Balances study load
- Minimizes conflicts
- Adaptive time allocation

## Error Handling

### Network Errors
- Connection timeouts
- Invalid URLs
- Authentication failures

### Parsing Errors
- Malformed ICS content
- Missing required fields
- Invalid date formats

### Scheduling Errors
- Conflicting time slots
- Invalid date ranges
- Resource constraints

## Future API Enhancements

### Canvas API Integration
- Direct API calls instead of ICS feeds
- Real-time updates
- Assignment details
- Grade information

### Study Analytics
- Study time tracking
- Performance metrics
- Progress monitoring
- Recommendations

### Notifications
- Assignment reminders
- Study session alerts
- Deadline warnings
- Progress updates
