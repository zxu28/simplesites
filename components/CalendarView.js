// React core import - Provides the component framework for building UI components
import React from 'react';
// React Native UI components - View creates layout containers, Text renders text content,
// StyleSheet defines CSS-like styles, TouchableOpacity makes elements tappable with press feedback
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// Calendar component import - Provides Calendar component for monthly calendar display
import { Calendar } from 'react-native-calendars';
// Color constants import - Provides predefined color values and theme configuration
// COLORS object contains color definitions, THEME object contains calendar-specific styling
import { COLORS, THEME } from '../constants/colors';

// CalendarView functional component - Displays a monthly calendar with event markings
// Props: selectedDate (string in YYYY-MM-DD format), onDateSelect (function called when date is tapped),
// markedDates (object with pre-marked dates), events (object with assignment events),
// studyBlocks (object with study block events)
const CalendarView = ({ 
  selectedDate,     // Currently selected date string
  onDateSelect,     // Callback function triggered when user taps a date
  markedDates,      // Pre-existing marked dates object
  events = {},      // Assignment events object (defaults to empty object)
  studyBlocks = {}  // Study block events object (defaults to empty object)
}) => {
  // getMarkedDates function - Processes all events and creates marked dates configuration
  // Returns an object that tells the Calendar component how to style each date
  const getMarkedDates = () => {
    // Start with a copy of any pre-existing marked dates
    // Spread operator (...) creates a shallow copy to avoid mutating the original
    const marked = { ...markedDates };
    
    // Mark dates that have assignment events
    // Object.keys() returns an array of all date keys in the events object
    Object.keys(events).forEach(date => {
      // Configure marking for this date - combines existing marking with assignment-specific styling
      marked[date] = {
        ...marked[date],        // Preserve any existing marking configuration
        marked: true,           // Enable marking for this date (shows dot)
        dotColor: COLORS.assignment, // Set dot color to assignment color
        customStyles: {         // Custom styling for the date cell
          container: {
            backgroundColor: COLORS.assignmentBackground, // Background color for assignment dates
            borderRadius: 8,    // Rounded corners for modern appearance
          },
          text: {
            color: COLORS.assignmentText, // Text color for assignment dates
            fontWeight: 'bold', // Bold text for emphasis
          },
        },
      };
    });

    // Mark dates that have study block events
    Object.keys(studyBlocks).forEach(date => {
      // Check if this date already has assignment marking
      if (marked[date]) {
        // If date already has assignments, add multiple dots (one for each event type)
        marked[date].dots = [
          { key: 'assignment', color: COLORS.assignment }, // Assignment dot
          { key: 'study', color: COLORS.study }             // Study block dot
        ];
        // Update background color to indicate mixed events
        marked[date].customStyles.container.backgroundColor = COLORS.studyBackground;
      } else {
        // If date only has study blocks, mark it with study block styling
        marked[date] = {
          ...marked[date],        // Preserve any existing marking configuration
          marked: true,           // Enable marking for this date
          dotColor: COLORS.study, // Set dot color to study block color
          customStyles: {        // Custom styling for study block dates
            container: {
              backgroundColor: COLORS.studyBackground, // Background color for study dates
              borderRadius: 8,   // Rounded corners for modern appearance
            },
            text: {
              color: COLORS.studyText, // Text color for study dates
              fontWeight: 'bold',      // Bold text for emphasis
            },
          },
        };
      }
    });

    // Mark the currently selected date with special highlighting
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate], // Preserve existing marking configuration
        selected: true,          // Enable selection highlighting
        selectedColor: COLORS.selectedDay, // Background color for selected date
        selectedTextColor: '#ffffff',      // White text color for contrast
      };
    }

    // Return the complete marked dates configuration object
    return marked;
  };

  // Main component rendering - Returns JSX that describes the calendar UI
  return (
    // Main container View - Wraps the calendar and legend in a styled container
    <View style={styles.container}>
      {/* Calendar component - Renders the monthly calendar grid */}
      <Calendar
        style={styles.calendar}                    // Apply calendar-specific styles
        current={selectedDate}                     // Set the currently displayed month to selected date
        onDayPress={onDateSelect}                 // Callback function when user taps a date
        markedDates={getMarkedDates()}            // Pass the processed marked dates configuration
        theme={THEME.calendar}                    // Apply theme styling from color constants
        monthFormat={'MMMM yyyy'}                 // Format for month/year display (e.g., "January 2024")
        hideExtraDays={true}                      // Hide dates from previous/next month
        firstDay={1}                              // Start week on Monday (1 = Monday, 0 = Sunday)
        showWeekNumbers={false}                   // Hide week numbers for cleaner appearance
        onMonthChange={(month) => {               // Callback when user changes month
          console.log('month changed', month);   // Log month changes for debugging
        }}
        enableSwipeMonths={true}                  // Allow swiping to change months
      />
      
      {/* Legend container - Shows what the different colored dots mean */}
      <View style={styles.legend}>
        {/* Assignment legend item - Shows assignment dot and label */}
        <View style={styles.legendItem}>
          {/* Assignment dot - Small colored circle representing assignment events */}
          <View style={[styles.legendDot, { backgroundColor: COLORS.assignment }]} />
          {/* Assignment label - Text explaining what the dot represents */}
          <Text style={styles.legendText}>Assignments</Text>
        </View>
        {/* Study block legend item - Shows study block dot and label */}
        <View style={styles.legendItem}>
          {/* Study block dot - Small colored circle representing study block events */}
          <View style={[styles.legendDot, { backgroundColor: COLORS.study }]} />
          {/* Study block label - Text explaining what the dot represents */}
          <Text style={styles.legendText}>Study Blocks</Text>
        </View>
      </View>
    </View>
  );
};

// StyleSheet.create() - Creates optimized style objects for React Native components
// Styles are created once and reused, improving performance compared to inline styles
const styles = StyleSheet.create({
  // container style - Main container styling for the CalendarView component
  container: {
    backgroundColor: COLORS.cardBackground, // Background color from color constants
    borderRadius: 10,                       // 10px rounded corners for modern appearance
    marginHorizontal: 16,                   // 16px margin on left and right sides
    marginBottom: 20,                       // 20px margin below the container
    elevation: 3,                           // Android shadow elevation (3dp)
    shadowColor: '#000',                    // iOS shadow color (black)
    shadowOffset: { width: 0, height: 2 },  // iOS shadow offset (2px down)
    shadowOpacity: 0.1,                     // iOS shadow opacity (10% transparent)
    shadowRadius: 4,                        // iOS shadow blur radius (4px)
  },
  // calendar style - Styling for the Calendar component itself
  calendar: {
    borderRadius: 10,                       // 10px rounded corners to match container
  },
  // legend style - Styling for the legend container at the bottom
  legend: {
    flexDirection: 'row',                    // Arrange legend items horizontally
    justifyContent: 'center',               // Center the legend items
    paddingVertical: 12,                    // 12px padding on top and bottom
    paddingHorizontal: 16,                  // 16px padding on left and right
    borderTopWidth: 1,                      // 1px border on top to separate from calendar
    borderTopColor: '#e0e0e0',              // Light gray border color
  },
  // legendItem style - Styling for individual legend items (dot + text)
  legendItem: {
    flexDirection: 'row',                    // Arrange dot and text horizontally
    alignItems: 'center',                    // Center-align items vertically
    marginHorizontal: 16,                   // 16px margin on left and right
  },
  // legendDot style - Styling for the colored dots in the legend
  legendDot: {
    width: 12,                               // 12px width for the dot
    height: 12,                              // 12px height for the dot
    borderRadius: 6,                         // 6px radius creates a perfect circle
    marginRight: 8,                         // 8px margin to the right of the dot
  },
  // legendText style - Styling for the text labels in the legend
  legendText: {
    fontSize: 12,                           // 12pt font size for legend text
    color: COLORS.textSecondary,             // Secondary text color (typically lighter)
    fontWeight: '500',                      // Medium font weight for readability
  },
});

// Export the CalendarView component as the default export
// This allows other files to import and use this component
export default CalendarView;
