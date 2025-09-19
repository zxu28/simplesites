// React core import - Provides the component framework for building UI components
import React from 'react';
// React Native UI components - View creates layout containers, Text renders text content,
// StyleSheet defines CSS-like styles for consistent theming
import { View, Text, StyleSheet } from 'react-native';
// Color constants import - Provides predefined color values for consistent theming
// COLORS object contains color definitions like cardBackground, assignment, study, etc.
import { COLORS } from '../constants/colors';

// EventCard functional component - Displays individual event information in a card format
// Props: event (object containing event data), type (string indicating event type, defaults to 'assignment')
const EventCard = ({ event, type = 'assignment' }) => {
  // Determine if this event is an assignment based on the type prop
  // Boolean comparison that will be true if type equals 'assignment', false otherwise
  const isAssignment = type === 'assignment';
  
  // Select appropriate card styling based on event type
  // Ternary operator chooses assignmentCard styles if isAssignment is true, studyCard styles otherwise
  const cardStyle = isAssignment ? styles.assignmentCard : styles.studyCard;
  
  // Select appropriate badge styling based on event type
  // Badge is the small colored label that indicates event type
  const badgeStyle = isAssignment ? styles.assignmentBadge : styles.studyBadge;
  
  // Select appropriate badge text styling based on event type
  // Text styling within the badge for proper contrast and readability
  const badgeTextStyle = isAssignment ? styles.assignmentBadgeText : styles.studyBadgeText;

  // Main component rendering - Returns JSX that describes the UI structure
  return (
    // Main card container - Combines base eventCard styles with type-specific card styles
    // Array syntax [styles.eventCard, cardStyle] merges multiple style objects
    <View style={[styles.eventCard, cardStyle]}>
      {/* Event header section - Contains title and type badge in a horizontal layout */}
      <View style={styles.eventHeader}>
        {/* Event title text - Displays the main event name/title */}
        <Text style={styles.eventTitle}>{event.title}</Text>
        {/* Type badge container - Small colored label indicating event type */}
        <View style={badgeStyle}>
          {/* Badge text - Shows "Assignment" or "Study Block" based on event type */}
          <Text style={badgeTextStyle}>
            {isAssignment ? 'Assignment' : 'Study Block'}
          </Text>
        </View>
      </View>
      
      {/* Event time display - Shows the scheduled time for the event */}
      <Text style={styles.eventTime}>{event.time}</Text>
      
      {/* Conditional description rendering - Only displays if description exists */}
      {/* Logical AND operator (&&) renders the Text component only if event.description is truthy */}
      {event.description && (
        <Text style={styles.eventDescription}>{event.description}</Text>
      )}
      
      {/* Conditional duration rendering - Only displays if duration exists */}
      {/* Shows how long the event is scheduled to last */}
      {event.duration && (
        <Text style={styles.eventDuration}>Duration: {event.duration}</Text>
      )}
      
      {/* Conditional location rendering - Only displays if location exists */}
      {/* Shows where the event takes place with a location emoji */}
      {event.location && (
        <Text style={styles.eventLocation}>📍 {event.location}</Text>
      )}
    </View>
  );
};

// StyleSheet.create() - Creates optimized style objects for React Native components
// Styles are created once and reused, improving performance compared to inline styles
const styles = StyleSheet.create({
  // eventCard style - Base styling for all event cards
  eventCard: {
    backgroundColor: COLORS.cardBackground, // Background color from color constants
    padding: 16,                           // 16px padding on all sides
    marginBottom: 12,                      // 12px margin below the card
    borderRadius: 8,                       // 8px rounded corners for modern appearance
    elevation: 2,                          // Android shadow elevation (2dp)
    shadowColor: '#000',                   // iOS shadow color (black)
    shadowOffset: { width: 0, height: 1 },  // iOS shadow offset (1px down)
    shadowOpacity: 0.1,                    // iOS shadow opacity (10% transparent)
    shadowRadius: 2,                       // iOS shadow blur radius (2px)
  },
  // assignmentCard style - Additional styling for assignment cards
  assignmentCard: {
    borderLeftWidth: 4,                    // 4px left border width
    borderLeftColor: COLORS.assignment,    // Left border color for assignments
  },
  // studyCard style - Additional styling for study block cards
  studyCard: {
    borderLeftWidth: 4,                    // 4px left border width
    borderLeftColor: COLORS.study,         // Left border color for study blocks
  },
  // eventHeader style - Styling for the header section containing title and badge
  eventHeader: {
    flexDirection: 'row',                  // Arrange children horizontally
    justifyContent: 'space-between',       // Space children apart (title left, badge right)
    alignItems: 'flex-start',              // Align children to the top
    marginBottom: 8,                       // 8px margin below the header
  },
  // eventTitle style - Styling for the event title text
  eventTitle: {
    fontSize: 16,                          // 16pt font size
    fontWeight: 'bold',                    // Bold font weight for emphasis
    color: COLORS.textPrimary,             // Primary text color
    flex: 1,                               // Take up remaining space in flex container
    marginRight: 8,                        // 8px margin to the right of title
  },
  // assignmentBadge style - Styling for assignment type badges
  assignmentBadge: {
    backgroundColor: COLORS.assignmentBackground, // Background color for assignment badges
    paddingHorizontal: 8,                  // 8px padding on left and right
    paddingVertical: 4,                    // 4px padding on top and bottom
    borderRadius: 12,                      // 12px rounded corners for pill shape
  },
  // studyBadge style - Styling for study block type badges
  studyBadge: {
    backgroundColor: COLORS.studyBackground, // Background color for study badges
    paddingHorizontal: 8,                  // 8px padding on left and right
    paddingVertical: 4,                    // 4px padding on top and bottom
    borderRadius: 12,                      // 12px rounded corners for pill shape
  },
  // assignmentBadgeText style - Text styling within assignment badges
  assignmentBadgeText: {
    fontSize: 12,                          // 12pt font size (smaller than title)
    fontWeight: 'bold',                    // Bold font weight
    color: COLORS.assignmentText,           // Text color for assignment badges
  },
  // studyBadgeText style - Text styling within study badges
  studyBadgeText: {
    fontSize: 12,                          // 12pt font size (smaller than title)
    fontWeight: 'bold',                    // Bold font weight
    color: COLORS.studyText,               // Text color for study badges
  },
  // eventTime style - Styling for the event time display
  eventTime: {
    fontSize: 14,                          // 14pt font size
    color: COLORS.textSecondary,           // Secondary text color (typically lighter)
    marginBottom: 8,                       // 8px margin below the time
    fontWeight: '500',                     // Medium font weight (between normal and bold)
  },
  // eventDescription style - Styling for the event description text
  eventDescription: {
    fontSize: 14,                          // 14pt font size
    color: COLORS.textPrimary,             // Primary text color
    marginBottom: 8,                       // 8px margin below the description
    lineHeight: 20,                        // 20pt line height for better readability
  },
  // eventDuration style - Styling for the event duration display
  eventDuration: {
    fontSize: 12,                          // 12pt font size (smaller text)
    color: COLORS.textSecondary,           // Secondary text color
    marginBottom: 4,                       // 4px margin below the duration
  },
  // eventLocation style - Styling for the event location display
  eventLocation: {
    fontSize: 12,                          // 12pt font size (smaller text)
    color: COLORS.textSecondary,           // Secondary text color
    fontStyle: 'italic',                   // Italic font style for visual distinction
  },
});

// Export the EventCard component as the default export
// This allows other files to import and use this component
export default EventCard;
