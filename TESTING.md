# Study Calendar - Testing Guide

## Testing Overview
This guide covers testing strategies for the Study Calendar React Native app.

## Unit Testing

### Test Setup
```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native

# Run tests
npm test
```

### Test Files Structure
```
__tests__/
├── components/
│   ├── EventCard.test.js
│   ├── CalendarView.test.js
│   └── EventsList.test.js
├── utils/
│   ├── icsParser.test.js
│   ├── studyScheduler.test.js
│   └── dateHelpers.test.js
└── App.test.js
```

### Example Test: ICS Parser
```javascript
import { parseICSFeed } from '../utils/icsParser';

describe('ICS Parser', () => {
  test('should parse valid ICS content', () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20241215T235900Z
SUMMARY:Test Assignment
END:VEVENT
END:VCALENDAR`;

    const events = parseICSFeed(icsContent);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Test Assignment');
  });

  test('should handle invalid ICS content', () => {
    expect(() => parseICSFeed('invalid content')).toThrow();
  });
});
```

## Integration Testing

### Calendar Integration
- Test calendar rendering
- Test date selection
- Test event marking
- Test study block generation

### ICS Feed Integration
- Test real Canvas feeds
- Test error handling
- Test data parsing
- Test network failures

## End-to-End Testing

### Manual Testing Checklist

#### Calendar Functionality
- [ ] Calendar displays correctly
- [ ] Date selection works
- [ ] Events are marked properly
- [ ] Study blocks appear on correct dates
- [ ] Color coding is accurate

#### Event Management
- [ ] Assignments display correctly
- [ ] Study blocks are generated
- [ ] Event details are accurate
- [ ] Time formatting is correct
- [ ] Descriptions are shown

#### User Interface
- [ ] App loads without errors
- [ ] Navigation works smoothly
- [ ] Responsive design on different screen sizes
- [ ] Accessibility features work
- [ ] Performance is acceptable

### Device Testing
- iOS devices (iPhone, iPad)
- Android devices (various screen sizes)
- Web browser (Chrome, Safari, Firefox)

## Performance Testing

### Metrics to Monitor
- App startup time
- Calendar rendering performance
- Memory usage
- Battery consumption
- Network efficiency

### Tools
- React Native Performance Monitor
- Flipper
- Chrome DevTools (web)
- Xcode Instruments (iOS)
- Android Studio Profiler (Android)

## Accessibility Testing

### Screen Reader Support
- Test with VoiceOver (iOS)
- Test with TalkBack (Android)
- Verify all elements are accessible
- Check navigation flow

### Visual Accessibility
- Color contrast ratios
- Font sizes
- Touch target sizes
- High contrast mode support

## Error Handling Testing

### Network Errors
- Test offline scenarios
- Test slow connections
- Test invalid URLs
- Test authentication failures

### Data Errors
- Test malformed ICS content
- Test missing required fields
- Test invalid date formats
- Test empty responses

## Continuous Integration

### GitHub Actions
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
```

### Pre-commit Hooks
- Lint code
- Run tests
- Check formatting
- Validate dependencies

## Testing Best Practices

### Test Organization
- Group related tests
- Use descriptive test names
- Keep tests independent
- Mock external dependencies

### Test Data
- Use realistic test data
- Include edge cases
- Test error conditions
- Validate all scenarios

### Maintenance
- Update tests with code changes
- Remove obsolete tests
- Refactor test code
- Monitor test coverage
