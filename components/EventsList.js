// React core import - Provides the component framework for building UI components
import React from 'react';
// React Native UI components - View creates layout containers, Text renders text content,
// StyleSheet defines CSS-like styles, ScrollView enables scrolling content
import { View, Text, StyleSheet, ScrollView } from 'react-native';
// Color constants import - Provides predefined color values for consistent theming
// COLORS object contains color definitions like textPrimary, textSecondary, etc.
import { COLORS } from '../constants/colors';
// EventCard component import - Reusable component for displaying individual event information
import EventCard from './EventCard';

// EventsList functional component - Displays a scrollable list of events for a selected date
// Props: events (array of event objects), studyBlocks (array of study block objects), 
// selectedDate (string in YYYY-MM-DD format)
const EventsList = ({ events = [], studyBlocks = [], selectedDate }) => {
  // Combine events and studyBlocks into a single array for unified processing
  // Spread operator (...) creates a new array containing all elements from both arrays
  const allEvents = [...events, ...studyBlocks];
  
  // Sort events by time in ascending order (earliest to latest)
  // sort() method modifies the array in place and returns the sorted array
  const sortedEvents = allEvents.sort((a, b) => {
    // Extract time property from each event, defaulting to '00:00' if time is undefined
    // This ensures events without time information are sorted to the beginning
    const timeA = a.time || '00:00';
    const timeB = b.time || '00:00';
    // localeCompare() performs string comparison that respects locale-specific sorting rules
    // Returns -1 if timeA comes before timeB, 0 if equal, 1 if timeA comes after timeB
    return timeA.localeCompare(timeB);
  });

  // formatSelectedDate function - Converts date string to human-readable format
  // Takes a date string (YYYY-MM-DD format) and returns formatted date string
  const formatSelectedDate = (date) => {
    // Return empty string if no date is provided
    if (!date) return '';
    // Convert date string to JavaScript Date object
    // new Date() parses the YYYY-MM-DD string into a proper Date instance
    const dateObj = new Date(date);
    // Format date using locale-specific formatting options
    // toLocaleDateString() converts Date object to string using specified options
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',    // Display full weekday name (e.g., "Monday")
      year: 'numeric',    // Display full year (e.g., "2024")
      month: 'long',      // Display full month name (e.g., "January")
      day: 'numeric',     // Display day of month (e.g., "15")
    });
  };

  // Empty state rendering - Displayed when no events are scheduled for the selected date
  // This provides user feedback and guidance when the list would otherwise be empty
  if (sortedEvents.length === 0) {
    return (
      // Container View - Main layout container with flex: 1 to fill available space
      <View style={styles.container}>
        {/* Title Text - Displays formatted date with "Events for" prefix */}
        <Text style={styles.title}>
          Events for {formatSelectedDate(selectedDate)}
        </Text>
        {/* Empty state container - Centers content vertically and horizontally */}
        <View style={styles.emptyState}>
          {/* Primary empty message - Informs user no events are scheduled */}
          <Text style={styles.emptyText}>No events scheduled for this date</Text>
          {/* Secondary empty message - Provides guidance on how to see events */}
          <Text style={styles.emptySubtext}>
            Tap on a date with events to see them here
          </Text>
        </View>
      </View>
    );
  }

  // Main rendering - Displayed when events are available for the selected date
  return (
    // Container View - Main layout container with flex: 1 to fill available space
    <View style={styles.container}>
      {/* Title Text - Displays formatted date with "Events for" prefix */}
      <Text style={styles.title}>
        Events for {formatSelectedDate(selectedDate)}
      </Text>
      
      {/* ScrollView - Enables vertical scrolling through the list of events */}
      <ScrollView 
        style={styles.scrollView}           // Apply scrollView styles for layout
        showsVerticalScrollIndicator={false} // Hide the vertical scroll indicator for cleaner UI
      >
        {/* Map over sortedEvents array to render each event as an EventCard component */}
        {sortedEvents.map((event, index) => (
          <EventCard
            // key prop - Unique identifier for React's reconciliation algorithm
            // Combines event.id (if available) or index with event.type to ensure uniqueness
            key={`${event.id || index}_${event.type}`}
            // event prop - Passes the entire event object to EventCard for rendering
            event={event}
            // type prop - Passes the event type (e.g., 'assignment', 'google', 'CanvasAssignment')
            type={event.type}
          />
        ))}
      </ScrollView>
    </View>
  );
};

// StyleSheet.create() - Creates optimized style objects for React Native components
// Styles are created once and reused, improving performance compared to inline styles
const styles = StyleSheet.create({
  // container style - Main container styling for the EventsList component
  container: {
    flex: 1,                    // Take up all available vertical space
    paddingHorizontal: 16,       // Add 16px padding on left and right sides
  },
  // title style - Styling for the date title text
  title: {
    fontSize: 18,                // Set font size to 18 points
    fontWeight: 'bold',         // Make text bold for emphasis
    marginBottom: 16,           // Add 16px margin below the title
    color: COLORS.textPrimary,   // Use primary text color from color constants
  },
  // scrollView style - Styling for the ScrollView container
  scrollView: {
    flex: 1,                    // Take up remaining vertical space after title
  },
  // emptyState style - Styling for the empty state container
  emptyState: {
    alignItems: 'center',       // Center content horizontally
    justifyContent: 'center',   // Center content vertically
    paddingVertical: 40,        // Add 40px padding on top and bottom
    paddingHorizontal: 20,      // Add 20px padding on left and right
  },
  // emptyText style - Styling for the primary empty state message
  emptyText: {
    fontSize: 16,                // Set font size to 16 points
    color: COLORS.textSecondary, // Use secondary text color (typically lighter)
    textAlign: 'center',        // Center-align the text
    marginBottom: 8,            // Add 8px margin below the text
  },
  // emptySubtext style - Styling for the secondary empty state message
  emptySubtext: {
    fontSize: 14,                // Set font size to 14 points (smaller than primary)
    color: COLORS.textSecondary, // Use secondary text color
    textAlign: 'center',        // Center-align the text
    fontStyle: 'italic',        // Make text italic for visual distinction
  },
});

// Export the EventsList component as the default export
// This allows other files to import and use this component
export default EventsList;
