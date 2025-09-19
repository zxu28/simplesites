// ============================================================================
// IMPORTS AND DEPENDENCIES
// ============================================================================

// React core imports - React provides the component framework, useState manages component state variables
// that trigger re-renders when changed, useEffect handles side effects like API calls and lifecycle events
import React, { useState, useEffect } from 'react';

// React Native UI components - View creates layout containers, Text renders text content, StyleSheet
// defines CSS-like styles, ScrollView enables scrolling content, Alert shows native popup dialogs,
// TextInput creates editable text fields, TouchableOpacity makes elements tappable with press feedback,
// Modal creates overlay dialogs, Picker provides dropdown selection, Platform detects iOS/Android
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity, Modal, Picker, Platform } from 'react-native';

// Calendar component - Provides Calendar component that renders a monthly calendar grid with date selection,
// event marking capabilities, and customizable styling for displaying assignment due dates
import { Calendar } from 'react-native-calendars';

// DateTimePicker - Native date/time picker component that opens platform-specific date/time selection
// dialogs for choosing assignment due dates and times, handles iOS/Android differences automatically
import DateTimePicker from '@react-native-community/datetimepicker';

// Expo AuthSession - Provides OAuth 2.0 authentication flow for Google Calendar integration,
// handles token exchange, redirect URIs, and secure credential storage
import * as AuthSession from 'expo-auth-session';
// makeRedirectUri - Generates the correct redirect URI for OAuth flow based on platform (web/mobile)
import { makeRedirectUri } from 'expo-auth-session';

// Expo Notifications - Provides push notification capabilities for assignment reminders,
// handles scheduling, permissions, and notification display across platforms
import * as Notifications from 'expo-notifications';

// ICAL.js - JavaScript library for parsing ICS (iCalendar) files from Canvas LMS,
// converts Canvas assignment feeds into JavaScript objects with event data
import ICAL from 'ical.js';

// Google configuration utilities - GOOGLE_CONFIG contains OAuth client IDs for different platforms,
// debugGoogleConfig logs configuration details for troubleshooting, validateGoogleConfig checks
// if all required OAuth credentials are properly set up before attempting authentication
import { 
  GOOGLE_CONFIG,
  debugGoogleConfig,
  validateGoogleConfig
} from './config/google';

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

// Logs successful app initialization to console for debugging purposes
console.log('📱 App.js loaded successfully');

// Google Apps Script URL - Custom Google Apps Script that acts as a proxy to fetch Google Calendar events
// This script runs on Google's servers and calls the Google Calendar API on behalf of the app,
// avoiding CORS (Cross-Origin Resource Sharing) restrictions that prevent direct API calls from browsers
// The script returns JSON data with calendar events that can be consumed by the React Native app
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby12GiVuGImRqu16g4sOr5h6l-ptx3SqPGhve7H-jhNe8wzIrn8tib3cedPLN3t4F5O/exec";

// Canvas ICS feed URL - Direct ICS (iCalendar) calendar feed from Canvas Learning Management System
// ICS is a standard RFC 5545 format for calendar data exchange used by most calendar applications
// This URL provides all Canvas assignments, due dates, and course events in a machine-readable format
// The feed is user-specific and requires authentication to access assignment data
const CANVAS_ICS_URL = "https://pomfret.instructure.com/feeds/calendars/user_U5a3dGrIE7Y45lSX7KUDM87bRYen3k9NWxyuvQOn.ics";

// ============================================================================
// WEBBROWSER CONFIGURATION FOR OAUTH
// ============================================================================

// Configure WebBrowser for OAuth authentication flow (only required for web platforms)
// WebBrowser handles the OAuth redirect flow by opening Google's authentication page
// and capturing the authorization code when the user completes the login process
// This configuration is not needed on native platforms (iOS/Android) where OAuth
// is handled differently through the system browser or in-app web views
if (typeof window !== 'undefined') {
  try {
    // Dynamically import WebBrowser module only when running on web platform
    // This prevents errors on native platforms where WebBrowser is not available
    const WebBrowser = require('expo-web-browser');
    // Complete any pending OAuth sessions from previous authentication attempts
    // This cleans up any incomplete OAuth flows that might be lingering in browser state
    WebBrowser.maybeCompleteAuthSession();
    console.log('✅ WebBrowser configured for OAuth');
  } catch (error) {
    // This error is expected on native platforms where WebBrowser module is not available
    // The error is caught and logged as a warning rather than crashing the app
    console.warn('⚠️ WebBrowser not available (expected on native):', error.message);
  }
}

/**
 * StudyCalendar App - Google Calendar Integration with Expo Auth Session
 * 
 * This app fetches events from Google Calendar API using expo-auth-session
 * and allows users to add manual assignments.
 * Canvas assignments should be synced to Google Calendar externally.
 * 
 * Setup Instructions:
 * 1. Create a .env file in the project root
 * 2. Add the following environment variables:
 *    - EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_web_client_id_here
 *    - EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your_ios_client_id_here  
 *    - EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your_android_client_id_here
 * 3. Get your Google Client IDs from Google Cloud Console:
 *    - Go to https://console.cloud.google.com/
 *    - Create/select a project
 *    - Enable Google Calendar API
 *    - Create OAuth 2.0 credentials for Web, iOS, and Android applications
 *    - Add http://localhost:8082 to authorized origins (for Expo web)
 *    - Use bundle identifier com.studycalendar.app for iOS
 *    - Use package name com.studycalendar.app for Android
 *    - Copy the Client IDs to your .env file
 */

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  // ============================================================================
  // STATE MANAGEMENT - All the data the app needs to track
  // ============================================================================
  
  // Manual assignments state - Stores user-created assignments added through the add assignment form
  // Structure: { "2024-01-15": { assignments: [{ title, description, dueDate, course, priority, ... }] } }
  // Key is date string in YYYY-MM-DD format, value contains array of assignment objects
  // This state persists across app sessions and is used to display user-created assignments
  const [manualAssignments, setManualAssignments] = useState({});
  
  // Google Calendar events state - Main events container that combines all event sources
  // Structure: { "2024-01-15": { assignments: [{ type, title, description, dotColor, ... }] } }
  // Contains events from: Google Calendar API, Google Apps Script, Canvas ICS, and manual assignments
  // This is the primary state used by the calendar component for rendering event dots
  const [googleEvents, setGoogleEvents] = useState({});
  
  // Selected date state - Tracks which date is currently selected on the calendar
  // Value is date string in YYYY-MM-DD format, initialized to today's date
  // Used to highlight the selected date and show events for that specific date
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Modal visibility states - Control which UI overlays are currently displayed
  const [showAddModal, setShowAddModal] = useState(false); // Controls add assignment form modal visibility
  const [showDatePicker, setShowDatePicker] = useState(false); // Controls date picker modal visibility
  
  // View mode state - Determines which main view is currently displayed
  // 'calendar' shows the monthly calendar grid with event dots
  // 'list' shows a scrollable list of all assignments sorted by selected criteria
  const [currentView, setCurrentView] = useState('calendar');
  
  // Sorting state - Controls how assignments are ordered in list view
  // Options: 'date' (by due date), 'class' (by course), 'type' (by assignment type),
  // 'priority' (by priority level), 'category' (by category)
  const [sortBy, setSortBy] = useState('date');
  
  // Form data state for new assignments - Stores user input while creating a new assignment
  // This object contains all the form fields that users fill out in the add assignment modal
  // Each field has a default value and gets updated as the user types in the form
  const [newAssignment, setNewAssignment] = useState({
    title: '',           // Assignment title - required field, user-entered text
    description: '',    // Assignment description - optional detailed text about the assignment
    dueDate: '',        // Due date in YYYY-MM-DD format - selected via date picker
    time: '23:59',      // Due time in HH:MM format - defaults to end of day
    course: '',         // Course name - selected from dropdown menu
    assignmentType: '', // Type of assignment - selected from dropdown (Homework, Quiz, etc.)
    priority: 'Medium'  // Priority level - selected from dropdown (High, Medium, Low)
  });
  
  // Google Calendar authentication state - Tracks OAuth authentication status and tokens
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false); // Boolean indicating if user is authenticated with Google
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);   // Boolean indicating if OAuth flow is in progress
  const [accessToken, setAccessToken] = useState(null);            // String containing OAuth access token for API calls

  // ============================================================================
  // DROPDOWN OPTIONS - Predefined choices for assignment forms
  // ============================================================================
  
  // Course options array - Predefined list of courses for the assignment form dropdown
  // Each object contains a 'label' (displayed to user) and 'value' (stored in data)
  // Used by the Picker component to populate course selection dropdown
  const courseOptions = [
    { label: 'Select Course', value: '' },        // Default placeholder option
    { label: 'Math', value: 'math' },             // Mathematics course
    { label: 'English', value: 'english' },       // English/Language Arts course
    { label: 'History', value: 'history' },       // History/Social Studies course
    { label: 'Science', value: 'science' },        // Science course
    { label: 'Art', value: 'art' },               // Art course
    { label: 'Music', value: 'music' },           // Music course
    { label: 'Physical Education', value: 'pe' },  // Physical Education course
    { label: 'Other', value: 'other' }            // Catch-all for other courses
  ];

  // Assignment type options array - Categories for different types of academic work
  // Used by the Picker component to categorize assignments by their nature
  const assignmentTypeOptions = [
    { label: 'Select Type', value: '' },    // Default placeholder option
    { label: 'Homework', value: 'Homework' }, // Regular homework assignments
    { label: 'Project', value: 'Project' },   // Long-term projects
    { label: 'Test', value: 'Test' }          // Exams and quizzes
  ];

  // Priority level options array - Urgency levels for assignment prioritization
  // Used by the Picker component to set assignment priority for scheduling
  const priorityOptions = [
    { label: 'High', value: 'High' },     // Urgent assignments requiring immediate attention
    { label: 'Medium', value: 'Medium' }, // Standard priority assignments
    { label: 'Low', value: 'Low' }        // Low priority assignments that can be done later
  ];

  // ============================================================================
  // UI CONFIGURATION - Colors and visual settings
  // ============================================================================
  
  // Priority color mapping object - Maps priority levels to hex color codes for visual representation
  // Used by the calendar component to display colored dots indicating assignment urgency
  // Colors follow standard UI conventions: red for urgent, orange for normal, green for low priority
  const priorityColors = {
    High: '#e53935',    // Red hex color - indicates urgent assignments requiring immediate attention
    Medium: '#fb8c00',  // Orange hex color - indicates normal priority assignments
    Low: '#43a047'      // Green hex color - indicates low priority assignments that can be deferred
  };

  // ============================================================================
  // OAUTH CONFIGURATION - Google Calendar authentication setup
  // ============================================================================
  
  // Generate redirect URI for OAuth flow - This is where Google redirects the user after authentication
  // makeRedirectUri() automatically determines the correct URI based on platform (web/mobile)
  // For web: typically http://localhost:8082, for mobile: custom scheme like exp://localhost:8081
  const redirectUri = makeRedirectUri({});
  // Log the generated redirect URI for debugging OAuth configuration issues
  console.log('🔗 OAuth Redirect URI:', redirectUri);
  // Log the current origin to help debug platform-specific OAuth issues
  console.log('🌐 Current Origin:', typeof window !== 'undefined' ? window.location.origin : 'Native');

  // ============================================================================
  // PERSISTENCE FUNCTIONS - localStorage utilities for data persistence
  // ============================================================================
  
  // loadFromLocalStorage function - COMMENTED OUT to prevent stale data from overwriting fresh API data
  // This function would load saved manual assignments and Google events from browser localStorage
  // on app startup, but is disabled to ensure clean state until Google Calendar connection
  // const loadFromLocalStorage = () => {
  //   try {
  //     // Load manual assignments from localStorage using the key 'studyCalendar_manualAssignments'
  //     // localStorage.getItem() returns a string or null, so we check if data exists before parsing
  //     const savedManualAssignments = localStorage.getItem('studyCalendar_manualAssignments');
  //     if (savedManualAssignments) {
  //       // Parse the JSON string back into a JavaScript object
  //       // JSON.parse() converts the stored string back to the original object structure
  //       const parsedManualAssignments = JSON.parse(savedManualAssignments);
  //       // Log the number of dates loaded for debugging purposes
  //       console.log('📁 Loaded manual assignments from localStorage:', Object.keys(parsedManualAssignments).length, 'dates');
  //       // Update the manualAssignments state with the loaded data
  //       setManualAssignments(parsedManualAssignments);
  //     }
  //     
  //     // Load Google events from localStorage using the key 'studyCalendar_googleEvents'
  //     // This would restore previously fetched Google Calendar and Canvas events
  //     const savedGoogleEvents = localStorage.getItem('studyCalendar_googleEvents');
  //     if (savedGoogleEvents) {
  //       // Parse the JSON string back into a JavaScript object
  //       const parsedGoogleEvents = JSON.parse(savedGoogleEvents);
  //       // Log the number of dates loaded for debugging purposes
  //       console.log('📁 Loaded Google events from localStorage:', Object.keys(parsedGoogleEvents).length, 'dates');
  //       // Update the googleEvents state with the loaded data
  //       setGoogleEvents(parsedGoogleEvents);
  //     }
  //   } catch (error) {
  //     // Catch any JSON parsing errors or localStorage access issues
  //     console.error('❌ Error loading data from localStorage:', error);
  //   }
  // };
  
  // saveManualAssignmentsToStorage function - Saves manual assignments to browser localStorage
  // This function is called whenever manualAssignments state changes to persist user-created assignments
  const saveManualAssignmentsToStorage = (assignments) => {
    try {
      // Convert the assignments object to a JSON string and store it in localStorage
      // localStorage.setItem() stores data as strings, so we use JSON.stringify() to convert
      localStorage.setItem('studyCalendar_manualAssignments', JSON.stringify(assignments));
      console.log('💾 Saved manual assignments to localStorage:', Object.keys(assignments).length, 'dates');
    } catch (error) {
      console.error('❌ Error saving manual assignments to localStorage:', error);
    }
  };
  
  // Save Google events to localStorage
  const saveGoogleEventsToStorage = (events) => {
    try {
      localStorage.setItem('studyCalendar_googleEvents', JSON.stringify(events));
      console.log('💾 Saved Google events to localStorage:', Object.keys(events).length, 'dates');
    } catch (error) {
      console.error('❌ Error saving Google events to localStorage:', error);
    }
  };

  // ============================================================================
  // UTILITY FUNCTIONS - Helper functions for date/time calculations
  // ============================================================================
  
  // toLocalTriggerDate function - Calculates when to send assignment reminder notifications
  // Takes a due date string (YYYY-MM-DD format), number of days before due date to remind,
  // and hour of day (24-hour format) to send the reminder
  const toLocalTriggerDate = (dueDateYYYYMMDD, daysBefore, hour = 17) => {
    // Convert the due date string to a JavaScript Date object
    // new Date() parses the YYYY-MM-DD string into a proper Date instance
    const dueDate = new Date(dueDateYYYYMMDD);
    // Create a copy of the due date to avoid mutating the original
    const triggerDate = new Date(dueDate);
    // Subtract the specified number of days from the due date
    // setDate() modifies the date by the given number of days
    triggerDate.setDate(triggerDate.getDate() - daysBefore);
    // Set the time to the specified hour (default 5 PM) with minutes, seconds, and milliseconds to 0
    // setHours() sets the hour and resets minutes/seconds/milliseconds to 0
    triggerDate.setHours(hour, 0, 0, 0);
    
    // Ensure reminder is in the future (not in the past)
    // Get current date/time to compare against the calculated trigger date
    const now = new Date();
    // If the calculated trigger date is in the past, set it to 1 minute from now
    if (triggerDate <= now) {
      // setTime() sets the date to a specific timestamp (current time + 60,000 milliseconds)
      triggerDate.setTime(now.getTime() + 60000); // 1 minute from now
    }
    
    // Return the calculated trigger date for use in notification scheduling
    return triggerDate;
  };

  // requestNotificationPermissions function - Requests permission to send push notifications
  // This function must be called before scheduling any notifications on mobile devices
  // Returns a boolean indicating whether permission was granted
  const requestNotificationPermissions = async () => {
    try {
      // Request notification permissions from the system
      // Notifications.requestPermissionsAsync() returns a promise that resolves to permission status
      const { status } = await Notifications.requestPermissionsAsync();
      // Check if permission was granted (status must be 'granted' to send notifications)
      if (status !== 'granted') {
        // Log warning if permission was denied or not granted
        console.warn('Notification permissions not granted');
        // Return false to indicate notifications cannot be sent
        return false;
      }
      // Return true if permission was granted
      return true;
    } catch (error) {
      // Catch any errors during permission request (e.g., on platforms that don't support notifications)
      console.warn('Failed to request notification permissions:', error);
      // Return false to indicate notifications cannot be sent
      return false;
    }
  };

  // Schedule notifications for assignment
  const scheduleAssignmentNotifications = async (assignment) => {
    try {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        console.warn('Cannot schedule notifications without permission');
        return [];
      }

      const notificationIds = [];
      const dueDate = assignment.dueDate;
      const title = assignment.title;
      const className = assignment.course || 'No Course';

      // Schedule notification 1 day before due date at 17:00
      const oneDayBefore = toLocalTriggerDate(dueDate, 1, 17);
      const notificationId1 = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Due tomorrow',
          body: `${title} (${className}) due ${dueDate}`,
          sound: true,
        },
        trigger: oneDayBefore,
      });
      notificationIds.push(notificationId1);
      console.log(`Scheduled 1-day notification for assignment: ${title} (ID: ${notificationId1})`);

      // If priority is High, schedule additional notification 3 days before
      if (assignment.priority === 'High') {
        const threeDaysBefore = toLocalTriggerDate(dueDate, 3, 17);
        const notificationId2 = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'High Priority Assignment',
            body: `${title} (${className}) due in 3 days`,
            sound: true,
          },
          trigger: threeDaysBefore,
        });
        notificationIds.push(notificationId2);
        console.log(`Scheduled 3-day notification for high priority assignment: ${title} (ID: ${notificationId2})`);
      }

      return notificationIds;
    } catch (error) {
      console.warn('Failed to schedule notifications:', error);
      return [];
    }
  };

  // Cancel notifications for assignment
  const cancelAssignmentNotifications = async (notificationIds) => {
    try {
      for (const notificationId of notificationIds) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        console.log(`Cancelled notification: ${notificationId}`);
      }
    } catch (error) {
      console.warn('Failed to cancel notifications:', error);
    }
  };

  // categorizeEvent function - Analyzes event titles to determine category and visual styling
  // Takes an event title string and returns an object with category name and dot color
  // This function uses keyword matching to automatically categorize events from Google Calendar
  const categorizeEvent = (title) => {
    // Convert title to lowercase for case-insensitive keyword matching
    // toLowerCase() ensures that "Math" and "math" are treated the same way
    const titleLower = title.toLowerCase();
    
    // Classes category - Matches academic class names and subjects
    // Uses includes() to check if any of these keywords appear anywhere in the title
    if (titleLower.includes('hon') || titleLower.includes('humanities') || 
        titleLower.includes('math') || titleLower.includes('calculus') || 
        titleLower.includes('physics') || titleLower.includes('spanish')) {
      // Return category object with name and blue dot color (#1e88e5)
      return { category: 'Classes', dotColor: '#1e88e5' };
    }
    
    // Sports/Activities category - Matches athletic and extracurricular activities
    if (titleLower.includes('cross country') || titleLower.includes('ath') || 
        titleLower.includes('practice')) {
      // Return category object with name and green dot color (#43a047)
      return { category: 'Sports/Activities', dotColor: '#43a047' };
    }
    
    // Meetings/Chapel/Advisory category - Matches institutional and administrative events
    if (titleLower.includes('meeting') || titleLower.includes('chapel') || 
        titleLower.includes('advisor')) {
      return { category: 'Meetings/Chapel/Advisory', dotColor: '#fdd835' };
    }
    
    // Assignments/Tests
    if (titleLower.includes('homework') || titleLower.includes('test') || 
        titleLower.includes('quiz') || titleLower.includes('essay') || 
        titleLower.includes('project')) {
      return { category: 'Assignments/Tests', dotColor: '#e53935' };
    }
    
    // Default
    return { category: 'Other', dotColor: '#9e9e9e' };
  };

  // Fetch Google Apps Script events
  const fetchGoogleEvents = async () => {
    try {
      console.log('🔄 Fetching Google Apps Script events...');
      
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("📊 Raw Apps Script events:", JSON.stringify(data, null, 2));
      
      if (!data || !Array.isArray(data)) {
        console.log('No events found');
        return;
      }
      
      // Map events to our format with categorization
      const googleEvents = data.map(ev => {
        const categorization = categorizeEvent(ev.title);
        const eventId = ev.id || `GoogleEvent-${new Date(ev.start).toISOString().split("T")[0]}-${Math.random().toString(36).substr(2, 9)}`;
        return {
          title: ev.title,
          date: new Date(ev.start).toISOString().split("T")[0],
          type: "GoogleEvent",
          category: categorization.category,
          dotColor: categorization.dotColor,
          description: ev.description || '',
          time: new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: ev.end ? new Date(ev.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          location: ev.location || '',
          id: eventId // Use stable ID for deduplication
        };
      });
      
      // Debug logging - breakdown by category
      const categoryBreakdown = googleEvents.reduce((acc, event) => {
        acc[event.category] = (acc[event.category] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`✅ Fetched ${googleEvents.length} Google events`);
      console.log('📊 Event breakdown by category:', categoryBreakdown);
      
      // Merge Google events into existing events state
      setGoogleEvents(prevEvents => {
        const mergedEvents = { ...prevEvents };
        
        googleEvents.forEach(event => {
          const dateKey = event.date;
          
          if (!mergedEvents[dateKey]) {
            mergedEvents[dateKey] = { assignments: [] };
          }
          
          // Filter out events with the same id to prevent duplicates
          const existingEvents = mergedEvents[dateKey].assignments || [];
          const filteredEvents = existingEvents.filter(existingEvent => existingEvent.id !== event.id);
          
          // Add new Google event to the filtered assignments array
          mergedEvents[dateKey].assignments = [
            ...filteredEvents,
            event
          ];
          
          console.log(`📊 Date ${dateKey}: Filtered out ${existingEvents.length - filteredEvents.length} old GoogleEvent(s), added ${1} new GoogleEvent(s)`);
        });
        
        console.log('📊 Google Apps Script events merged into googleEvents state');
        console.log('📊 googleEvents state after Google Apps Script merge:', JSON.stringify(mergedEvents, null, 2));
        
        // Log summary to confirm no duplicates and show event breakdown
        const totalGoogleAppsScriptEvents = Object.values(mergedEvents).reduce((total, dayEvents) => {
          return total + (dayEvents.assignments?.filter(event => event.type === 'GoogleEvent').length || 0);
        }, 0);
        const totalGoogleAPIEvents = Object.values(mergedEvents).reduce((total, dayEvents) => {
          return total + (dayEvents.assignments?.filter(event => event.type === 'google').length || 0);
        }, 0);
        const totalCanvasEvents = Object.values(mergedEvents).reduce((total, dayEvents) => {
          return total + (dayEvents.assignments?.filter(event => event.type === 'CanvasAssignment').length || 0);
        }, 0);
        const totalClassEvents = Object.values(mergedEvents).reduce((total, dayEvents) => {
          return total + (dayEvents.assignments?.filter(event => event.type === 'assignment').length || 0);
        }, 0);
        
        console.log(`📊 Event source breakdown after Google Apps Script merge:`);
        console.log(`  🔵 Google Apps Script (GoogleEvent): ${totalGoogleAppsScriptEvents} (should equal ${googleEvents.length})`);
        console.log(`  📅 Google Calendar API (google): ${totalGoogleAPIEvents}`);
        console.log(`  📘 Canvas events (CanvasAssignment): ${totalCanvasEvents}`);
        console.log(`  🎓 Class events (assignment): ${totalClassEvents}`);
        console.log(`📊 Total events: ${totalGoogleAppsScriptEvents + totalGoogleAPIEvents + totalCanvasEvents + totalClassEvents}`);
        
        return mergedEvents;
      });
      
    } catch (error) {
      console.error('Failed to fetch Google Apps Script events:', error);
      Alert.alert('Error', 'Failed to load Google Calendar events');
    }
  };

  // Configure Google OAuth request for any user to login
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      expoClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_EXPO,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      redirectUri: redirectUri,
    },
    {
      useProxy: false, // Set to false for web
    }
  );

  // ============================================================================
  // REACT LIFECYCLE HOOKS - useEffect hooks for app initialization and OAuth
  // ============================================================================
  
  /**
   * useEffect - App initialization and configuration validation
   * 
   * This hook runs once when the app component mounts and:
   * 1. Logs environment information (platform, environment variables)
   * 2. Validates Google OAuth configuration
   * 3. Shows setup instructions if configuration is missing
   * 4. Fetches initial Google Apps Script events
   * 
   * This is the first thing that happens when the app starts.
   */
  useEffect(() => {
    console.log('✅ App component mounted successfully');
    console.log('=== Environment Check ===');
    console.log('Platform:', typeof window !== 'undefined' ? 'Web' : 'Native');
    console.log('Environment variables:');
    console.log('- EXPO_PUBLIC_GOOGLE_CLIENT_ID:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Not set');
    console.log('- EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ? '✅ Set' : '❌ Not set');
    console.log('- EXPO_PUBLIC_GOOGLE_CLIENT_ID_EXPO:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_EXPO ? '✅ Set' : '❌ Not set');
    console.log('- EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ? '✅ Set' : '❌ Not set');
    console.log('- EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ? '✅ Set' : '❌ Not set');
    
    console.log('=== Google Configuration Debug ===');
    debugGoogleConfig();
    
    console.log('=== Configuration Validation ===');
    const configErrors = validateGoogleConfig();
    if (configErrors.length > 0) {
      console.error('❌ Google configuration errors:', configErrors);
      console.log('💡 To fix: Create a .env file with your Google Client IDs');
      Alert.alert(
        'Google Calendar Setup Required',
        `Please configure Google Calendar integration:\n\n${configErrors.join('\n')}\n\nCheck the console for detailed setup instructions.`
      );
    } else {
      console.log('✅ Google configuration is valid');
    }
    
    console.log('=== Loading persisted data ===');
    // Load persisted data from localStorage
    // loadFromLocalStorage();
    
    console.log('=== App initialization complete ===');
    
    // Fetch Google Apps Script events on initial load
    // fetchGoogleEvents();
    
    // Print Google Cloud Console OAuth setup instructions
    console.log('📋 GOOGLE CLOUD CONSOLE OAUTH SETUP INSTRUCTIONS:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create a new project or select existing one');
    console.log('3. Enable Google Calendar API');
    console.log('4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"');
    console.log('5. Create a "Web application" client');
    console.log('6. Add the following to your OAuth client:');
    console.log(`   📍 Authorized JavaScript origins: ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8082'}`);
    console.log(`   🔗 Authorized redirect URIs: ${redirectUri}`);
    console.log('7. Copy the Client IDs and add them to your .env file as:');
    console.log('   EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your_web_client_id_here');
    console.log('   EXPO_PUBLIC_GOOGLE_CLIENT_ID_EXPO=your_expo_client_id_here');
    console.log('   EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your_ios_client_id_here');
    console.log('   EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your_android_client_id_here');
    console.log('8. Restart the app after adding the environment variables');
    console.log('==========================================');
  }, []);

  /**
   * useEffect - OAuth response handling and data fetching
   * 
   * This hook runs whenever the OAuth response changes and:
   * 1. Handles successful OAuth authentication
   * 2. Stores the access token and updates sign-in state
   * 3. Fetches Google Calendar events after successful authentication
   * 4. Fetches Canvas events after successful authentication
   * 5. Handles OAuth errors and user cancellation
   * 
   * This is triggered when the user completes Google OAuth flow.
   */
  useEffect(() => {
    if (response?.type === 'success') {
      console.log('✅ OAuth response received:', response.type);
      console.log('🔍 Full response object:', JSON.stringify(response, null, 2));
      
      const { authentication } = response;
      if (!authentication) {
        console.error('❌ OAuth response missing authentication object');
        console.error('❌ Available response keys:', Object.keys(response));
        Alert.alert('OAuth Error', 'Authentication object missing from OAuth response. Check console for details.');
        return;
      }
      
      console.log('✅ Authentication object found:', authentication);
      
      if (!authentication.accessToken) {
        console.error('❌ Access token missing from authentication object');
        console.error('❌ Authentication object keys:', Object.keys(authentication));
        Alert.alert('OAuth Error', 'Access token missing from authentication object. Check console for details.');
        return;
      }
      
      console.log('✅ Access token received, length:', authentication.accessToken.length);
      setAccessToken(authentication.accessToken);
      console.log("🔑 Google Access Token:", authentication.accessToken);
      setIsGoogleSignedIn(true);
      // Fetch events after successful authentication
      fetchGoogleEvents();
      fetchGoogleCalendarEventsData(authentication.accessToken);
      fetchCanvasEvents();
    } else if (response?.type === 'error') {
      console.error('❌ OAuth error response:', response.error);
      Alert.alert('Google OAuth Error', `Failed to connect to Google Calendar: ${response.error?.message || 'Unknown error'}`);
    } else if (response?.type === 'cancel') {
      console.log('OAuth cancelled by user');
    }
  }, [response]);

  /**
   * useEffect - Persist manualAssignments to localStorage
   * 
   * This hook runs whenever manualAssignments state changes and saves
   * the data to localStorage for persistence across browser refreshes.
   */
  // useEffect(() => {
  //   // Only save if manualAssignments is not empty (avoid saving initial empty state)
  //   if (Object.keys(manualAssignments).length > 0) {
  //     saveManualAssignmentsToStorage(manualAssignments);
  //   }
  // }, [manualAssignments]);

  /**
   * useEffect - Persist googleEvents to localStorage
   * 
   * This hook runs whenever googleEvents state changes and saves
   * the data to localStorage for persistence across browser refreshes.
   */
  // useEffect(() => {
  //   // Only save if googleEvents is not empty (avoid saving initial empty state)
  //   if (Object.keys(googleEvents).length > 0) {
  //     saveGoogleEventsToStorage(googleEvents);
  //   }
  // }, [googleEvents]);

  // Google Calendar Functions
  const handleGoogleSignIn = async () => {
    console.log('🔵 Connect Google Calendar button clicked');
    
    // Check if we have the required client IDs
    const hasWebClient = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    const hasExpoClient = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_EXPO;
    
    if (!hasWebClient && !hasExpoClient) {
      console.error('❌ No Google Client IDs configured');
      Alert.alert(
        'Google Calendar Setup Required',
        'Please configure Google Client IDs in your .env file. Check the console for setup instructions.'
      );
      return;
    }

    setIsGoogleLoading(true);
    try {
      if (isGoogleSignedIn && accessToken) {
        // If already signed in, just refresh events
        console.log('✅ Already signed in, refreshing events...');
        console.log("🔑 Current Access Token:", accessToken);
        await fetchGoogleCalendarEventsData(accessToken);
        Alert.alert('Success', 'Google Calendar events refreshed!');
      } else {
        // Start OAuth flow for any user to login
        console.log('🚀 Starting Google OAuth flow for user login...');
        console.log('📋 Redirect URI:', redirectUri);
        
        if (!request) {
          console.error('❌ OAuth request not ready');
          Alert.alert('OAuth Error', 'OAuth request not configured. Please check your environment variables.');
          return;
        }
        
        await promptAsync({ useProxy: false });
      }
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      Alert.alert('Google Calendar Error', `Failed to connect to Google Calendar: ${error.message}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    console.log('🔒 Disconnect Google Calendar button clicked');
    try {
      // Clear local state
      setAccessToken(null);
      setIsGoogleSignedIn(false);
      setGoogleEvents({});
      
      console.log('✅ Google Calendar disconnected successfully');
      Alert.alert('Success', 'Disconnected from Google Calendar');
    } catch (error) {
      console.error('❌ Google sign-out error:', error);
      Alert.alert('Error', `Failed to disconnect: ${error.message}`);
    }
  };

  // ============================================================================
  // DATA STRUCTURE EXPLANATION
  // ============================================================================
  
  /**
   * EVENT DATA STRUCTURE
   * 
   * The app uses a unified event structure to store all types of events:
   * 
   * googleEvents State Structure:
   * {
   *   "2024-01-15": {
   *     assignments: [
   *       {
   *         title: "Math Homework",
   *         description: "Complete problems 1-20",
   *         time: "18:00",
   *         endTime: "19:00",
   *         type: "assignment" | "CanvasAssignment" | "google" | "GoogleEvent",
   *         category: "Assignment" | "Canvas Assignment" | "Google Event",
   *         dotColor: "#ff6b6b" | "#ff9800" | "#2196f3",
   *         location: "Online",
   *         id: "unique-event-id",
   *         source: "canvas" | undefined,
   *         colorId: "11" | undefined,
   *         // Additional fields for manual assignments:
   *         course: "math",
   *         assignmentType: "Homework",
   *         priority: "High" | "Medium" | "Low",
   *         completed: false
   *       }
   *     ]
   *   }
   * }
   * 
   * EVENT TYPES:
   * - "assignment": Manual assignments created by user (red dots)
   * - "CanvasAssignment": Canvas assignments from ICS feed (orange dots)
   * - "google": Google Calendar events (blue dots)
   * - "GoogleEvent": Google Apps Script events (blue dots)
   * 
   * DOT COLORS:
   * - Manual assignments: #ff6b6b (red)
   * - Canvas assignments: #ff9800 (orange)
   * - Google events: #2196f3 (blue)
   * - Priority-based colors for manual assignments
   */

  // ============================================================================
  // DATA FETCHING FUNCTIONS - Functions that retrieve events from external sources
  // ============================================================================
  
  /**
   * fetchGoogleCalendarEventsData - Fetches events from Google Calendar API
   * 
   * This function:
   * 1. Calls Google Calendar API with OAuth token
   * 2. Parses Google Calendar events
   * 3. Detects Canvas assignments (by colorId='11' or keywords)
   * 4. Merges events with existing state (preserves Canvas events)
   * 5. Updates the googleEvents state
   * 
   * @param {string} token - OAuth access token for Google Calendar API
   */
  const fetchGoogleCalendarEventsData = async (token = accessToken) => {
    console.log('🔄 fetchGoogleCalendarEventsData called');
    console.log('Token available:', !!token);
    
    // Check if we have a valid OAuth token
    if (!token) {
      console.log('❌ No access token available, skipping calendar fetch');
      return;
    }

    try {
      console.log('🔄 Fetching Google Calendar events...');
      
      // Set time range for fetching events (next 90 days)
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      
      console.log('📅 Time range:', { timeMin, timeMax });
      
      // Call Google Calendar API directly with user's access token
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&showDeleted=false&singleEvents=true&orderBy=startTime&maxResults=100&fields=items(id,summary,description,start,end,location,htmlLink,colorId)`;
      
      console.log('🌐 API URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Google Calendar API error:', response.status, errorText);
        
        if (response.status === 401) {
          throw new Error('Google Calendar API request failed – token expired or invalid. Please sign in again.');
        } else if (response.status === 403) {
          throw new Error('Google Calendar API request failed – check API access. Please ensure Google Calendar API is enabled.');
        } else {
          throw new Error(`Google Calendar API request failed – HTTP ${response.status}: ${errorText}`);
        }
      }

      const data = await response.json();
      const googleEventsList = data.items || [];
      
      console.log("🔍 Full Google Calendar API response:", JSON.stringify(data, null, 2));
      console.log('✅ Google Calendar API Response Status:', response.status);
      console.log('✅ Google Calendar events received:', googleEventsList.length, 'events');
      
      // Log all events with their date keys for debugging
      console.log('📋 All Google Calendar events with date keys:');
      googleEventsList.forEach((event, index) => {
        const startTime = event.start?.dateTime || event.start?.date;
        const eventDate = startTime ? new Date(startTime).toISOString().split('T')[0] : 'NO_DATE';
        
        console.log(`Event ${index + 1}:`, {
          title: event.summary || 'NO_TITLE',
          dateKey: eventDate,
          description: event.description,
          colorId: event.colorId,
          start: event.start,
          end: event.end,
          location: event.location,
          htmlLink: event.htmlLink
        });
      });
      
      // Log raw event details for debugging
      googleEventsList.forEach((event, index) => {
        console.log("📅 Raw Google event:", {
          id: event.id,
          title: event.summary,
          start: event.start,
          end: event.end,
          colorId: event.colorId,
          description: event.description,
          location: event.location
        });
      });
      
      if (googleEventsList.length === 0) {
        console.warn("⚠️ Google returned zero events.");
      }
      
      // Create unified events structure starting with existing googleEvents
      const unifiedEvents = { ...googleEvents };
      
      // Debug counters
      let canvasAssignmentCount = 0;
      let redEventCount = 0;
      let keywordCanvasCount = 0;
      let regularGoogleEventCount = 0;
      
      googleEventsList.forEach(event => {
        // Log each event being processed
        console.log("📅 Processing Google event:", {
          id: event.id,
          summary: event.summary,
          start: event.start,
          end: event.end,
          colorId: event.colorId,
          description: event.description,
          location: event.location
        });
        
        // Parse start time - handle both date and dateTime
        const startTime = event.start?.dateTime || event.start?.date;
        if (!startTime) return;
        
        const eventDate = new Date(startTime);
        const dateKey = eventDate.toISOString().split('T')[0];
        
        // Parse end time
        const endTime = event.end?.dateTime || event.end?.date;
        const endDate = endTime ? new Date(endTime) : eventDate;
        
        const eventTitle = event.summary || 'Google Event';
        const eventDescription = event.description || '';
        
        // Primary detection: Check for colorId = '11' (red blocks) - Canvas assignments
        const isRedEvent = event.colorId === '11';
        
        // Secondary detection: Keyword-based Canvas assignment detection (fallback)
        const isCanvasByKeyword = (title, description) => {
          const text = `${title || ''} ${description || ''}`.toLowerCase();
          return text.includes('hw') || text.includes('homework') || 
                 text.includes('essay') || text.includes('project') || 
                 text.includes('paper') || text.includes('quiz') || 
                 text.includes('assignment');
        };
        
        // Determine if this is a Canvas assignment
        const isCanvas = isRedEvent || isCanvasByKeyword(eventTitle, eventDescription);
        
        // Determine if this is a class event (regular Google Calendar events that aren't Canvas assignments)
        // Class events are typically recurring events with consistent titles and times
        const isClassEvent = !isCanvas && eventTitle && eventTitle.trim() !== '';
        
        // Log class event detection
        if (isClassEvent) {
          console.log(`🎓 Class Event Detected: "${eventTitle}"`, {
            id: event.id,
            colorId: event.colorId,
            startTime: startTime,
            isRecurring: event.id && event.id.includes('_')
          });
        }

        // Log Canvas assignment detection details
        if (isCanvas) {
          console.log(`🎯 Canvas Assignment Detected: "${eventTitle}"`, {
            isRedEvent,
            isCanvasByKeyword: isCanvasByKeyword(eventTitle, eventDescription),
            colorId: event.colorId,
            detectionMethod: isRedEvent ? 'colorId=11' : 'keyword match'
          });
        }

        // Count for debug logging
        if (isRedEvent) {
          redEventCount++;
          canvasAssignmentCount++;
        } else if (isCanvasByKeyword(eventTitle, eventDescription)) {
          keywordCanvasCount++;
          canvasAssignmentCount++;
        } else {
          regularGoogleEventCount++;
        }

        // Count for debug logging
        if (isRedEvent) {
          redEventCount++;
          canvasAssignmentCount++;
        } else if (isCanvasByKeyword(eventTitle, eventDescription)) {
          keywordCanvasCount++;
          canvasAssignmentCount++;
        } else if (isClassEvent) {
          regularGoogleEventCount++;
        }

        // Determine event type and styling
        let eventType, category, dotColor;
        if (isCanvas) {
          eventType = 'CanvasAssignment';
          category = 'Canvas Assignment';
          dotColor = '#ff9800'; // Orange for Canvas assignments
        } else if (isClassEvent) {
          eventType = 'assignment'; // Use assignment type for classes to get proper styling
          category = 'Class';
          dotColor = '#ff6b6b'; // Use assignment color for classes
        } else {
          eventType = 'google';
          category = 'Google Event';
          dotColor = '#2196f3'; // Blue for other Google events
        }
        // Improved merging logic: Handle recurring events and prevent duplicates
        const existingEvents = unifiedEvents[dateKey]?.assignments || [];
        
        // Debug: log existing events before filtering
        console.log("🗂 Existing events for", dateKey, existingEvents);
        
        // Simple filtering: only deduplicate by exact event.id match
        // This prevents true duplicates while preserving events from different sources
        const filteredEvents = existingEvents.filter(existingEvent => existingEvent.id !== event.id);
        
        // Debug: log filtered events after filtering
        console.log("🗑 Filtered events for", dateKey, filteredEvents);
        
        unifiedEvents[dateKey] = {
          ...unifiedEvents[dateKey],
          assignments: [
            ...filteredEvents,
            {
              title: eventTitle,
              description: eventDescription,
              time: eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              endTime: endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: eventType, // 'assignment', 'CanvasAssignment', or 'google'
              category: category, // 'Class', 'Canvas Assignment', or 'Google Event'
              dotColor: dotColor, // Color based on event type
              location: event.location || '',
              htmlLink: event.htmlLink || '',
              id: event.id,
              colorId: event.colorId
            }
          ]
        };
        console.log(`📊 Date ${dateKey}: Filtered out ${existingEvents.length - filteredEvents.length} old ${eventType}(s), added 1 new ${eventType}`);
      });
      
      // Debug logging for event counts
      console.log(`📊 Google Calendar breakdown: ${canvasAssignmentCount} total Canvas assignments`);
      console.log(`🔴 Red events (colorId='11'): ${redEventCount}`);
      console.log(`📝 Keyword-detected Canvas: ${keywordCanvasCount}`);
      console.log(`🎓 Class events: ${regularGoogleEventCount}`);
      
      // Warning if no class-type events detected
      if (regularGoogleEventCount === 0) {
        console.warn("⚠️ No class events detected in Google Calendar response.");
      }
      
      // Additional check for class events in the final structure
      const classEventCount = Object.values(unifiedEvents).reduce((total, dayEvents) => 
        total + (dayEvents.assignments?.filter(e => e.type === 'assignment').length || 0), 0);
      console.log(`🎓 Class events in final structure: ${classEventCount}`);

      console.log('📊 Parsed Google events into unified structure:', Object.keys(unifiedEvents).length, 'dates');
      console.log('📋 Total events across all dates:', Object.values(unifiedEvents).reduce((total, dayEvents) => total + (dayEvents.assignments?.length || 0), 0));
      
      // Log final unifiedEvents structure
      console.log("✅ Final unifiedEvents:", JSON.stringify(unifiedEvents, null, 2));
      
      // Debug: Log event counts by source and type
      const totalEvents = Object.values(unifiedEvents).reduce((total, dayEvents) => total + (dayEvents.assignments?.length || 0), 0);
      const classEvents = Object.values(unifiedEvents).reduce((total, dayEvents) => total + (dayEvents.assignments?.filter(e => e.type === 'assignment').length || 0), 0);
      const googleEvents = Object.values(unifiedEvents).reduce((total, dayEvents) => total + (dayEvents.assignments?.filter(e => e.type === 'google').length || 0), 0);
      const canvasEvents = Object.values(unifiedEvents).reduce((total, dayEvents) => total + (dayEvents.assignments?.filter(e => e.type === 'CanvasAssignment').length || 0), 0);
      const appsScriptEvents = Object.values(unifiedEvents).reduce((total, dayEvents) => total + (dayEvents.assignments?.filter(e => e.type === 'GoogleEvent').length || 0), 0);
      
      console.log("📊 Event counts by source:", {
        total: totalEvents,
        classes: classEvents,
        googleAPI: googleEvents,
        canvas: canvasEvents,
        appsScript: appsScriptEvents
      });
      
      // Update the unified events state
      console.log("🛠 DEBUG - Unified Events Preview:", JSON.stringify(unifiedEvents, null, 2));
      setGoogleEvents(unifiedEvents);
      
      // Debug logging after merge
      console.log('📊 googleEvents state after Google Calendar merge:', JSON.stringify(unifiedEvents, null, 2));
      console.log('📊 Total dates with events after Google Calendar merge:', Object.keys(unifiedEvents).length);
      console.log('📊 Total events across all dates after Google Calendar merge:', Object.values(unifiedEvents).reduce((total, dayEvents) => total + (dayEvents.assignments?.length || 0), 0));
      
      // Log summary to confirm both sources are preserved
      const totalGoogleEvents = Object.values(unifiedEvents).reduce((total, dayEvents) => {
        return total + (dayEvents.assignments?.filter(event => event.type === 'google').length || 0);
      }, 0);
      const totalGoogleAppsScriptEvents = Object.values(unifiedEvents).reduce((total, dayEvents) => {
        return total + (dayEvents.assignments?.filter(event => event.type === 'GoogleEvent').length || 0);
      }, 0);
      const totalCanvasFromGoogle = Object.values(unifiedEvents).reduce((total, dayEvents) => {
        return total + (dayEvents.assignments?.filter(event => event.type === 'CanvasAssignment').length || 0);
      }, 0);
      const totalClassEvents = Object.values(unifiedEvents).reduce((total, dayEvents) => {
        return total + (dayEvents.assignments?.filter(event => event.type === 'assignment').length || 0);
      }, 0);
      
      console.log(`📊 Event source breakdown after Google Calendar merge:`);
      console.log(`  📅 Google Calendar API (google): ${totalGoogleEvents}`);
      console.log(`  🔵 Google Apps Script (GoogleEvent): ${totalGoogleAppsScriptEvents}`);
      console.log(`  📘 Canvas from Google (CanvasAssignment): ${totalCanvasFromGoogle}`);
      console.log(`  🎓 Class events (assignment): ${totalClassEvents}`);
      console.log(`📊 Total events: ${totalGoogleEvents + totalGoogleAppsScriptEvents + totalCanvasFromGoogle + totalClassEvents}`);

    } catch (error) {
      console.error('❌ Error fetching Google Calendar events:', error);
      let errorMessage = `Failed to load Google Calendar events: ${error.message}`;
      
      Alert.alert('Google Calendar Error', errorMessage);
    }
  };

  /**
   * fetchCanvasEvents - Fetches Canvas assignments from ICS feed
   * 
   * This function:
   * 1. Fetches ICS calendar data from Canvas LMS
   * 2. Parses ICS data using ical.js library
   * 3. Converts Canvas events to unified format
   * 4. Merges Canvas events with existing googleEvents state
   * 5. Preserves existing Google Calendar events
   * 
   * Canvas events are automatically marked as type='CanvasAssignment'
   * with orange dotColor (#ff9800) for visual distinction
   */
  const fetchCanvasEvents = async () => {
    console.log('🔄 fetchCanvasEvents called');
    
    try {
      console.log('🔄 Fetching Canvas ICS feed...');
      
      // Fetch ICS calendar data from Canvas LMS
      const response = await fetch(CANVAS_ICS_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'text/calendar',
        },
      });

      console.log('✅ Canvas ICS Response Status:', response.status);
      
      if (!response.ok) {
        console.error('❌ Canvas ICS fetch failed:', response.status, response.statusText);
        throw new Error(`Canvas ICS fetch failed: ${response.status} ${response.statusText}`);
      }

      // Get the raw ICS data as text
      const icsData = await response.text();
      console.log('✅ Canvas ICS data received, length:', icsData.length);
      
      // Parse ICS data using ical.js
      const jcalData = ICAL.parse(icsData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');
      
      console.log('📋 Parsed Canvas events:', vevents.length, 'events');
      
      // Log raw Canvas event titles for debugging
      console.log("📘 Raw Canvas events:", vevents.map(v => new ICAL.Event(v).summary));
      
      // Debug logging: show all events with date keys
      console.log('📋 All Canvas events with date keys:');
      vevents.forEach((vevent, index) => {
        try {
          const event = new ICAL.Event(vevent);
          const startDate = event.startDate?.toJSDate();
          const dateKey = startDate ? startDate.toISOString().split('T')[0] : 'NO_DATE';
          
          console.log(`Canvas Event ${index + 1}:`, {
            title: event.summary || 'NO_TITLE',
            dateKey: dateKey,
            startDate: startDate,
            endDate: event.endDate?.toJSDate(),
            description: event.description,
            location: event.location,
            uid: event.uid
          });
        } catch (eventError) {
          console.warn(`⚠️ Error parsing Canvas event ${index + 1}:`, eventError);
        }
      });
      
      // Convert Canvas events to unified format
      const canvasEvents = {};
      let canvasAssignmentCount = 0;
      
      vevents.forEach(vevent => {
        try {
          const event = new ICAL.Event(vevent);
          const startDate = event.startDate?.toJSDate();
          const endDate = event.endDate?.toJSDate();
          
          if (!startDate) return;
          
          const dateKey = startDate.toISOString().split('T')[0];
          const eventTitle = event.summary || 'Canvas Assignment';
          const eventDescription = event.description || '';
          const eventLocation = event.location || '';
          
          // Create Canvas assignment object
          const canvasAssignment = {
            title: eventTitle,
            description: eventDescription,
            time: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            endTime: endDate ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            type: 'CanvasAssignment',
            category: 'Canvas Assignment',
            dotColor: '#ff9800',
            location: eventLocation,
            id: event.uid || `canvas-${Date.now()}-${Math.random()}`,
            source: 'canvas'
          };
          
          // Add to canvas events structure
          if (!canvasEvents[dateKey]) {
            canvasEvents[dateKey] = { assignments: [] };
          }
          canvasEvents[dateKey].assignments.push(canvasAssignment);
          canvasAssignmentCount++;
          
        } catch (eventError) {
          console.warn('⚠️ Error parsing Canvas event:', eventError);
        }
      });
      
      console.log(`📊 Canvas events parsed: ${canvasAssignmentCount} assignments across ${Object.keys(canvasEvents).length} dates`);
      
      if (vevents.length === 0) {
        console.warn("⚠️ Canvas ICS returned zero events.");
      }
      
      // Merge Canvas events into existing googleEvents state
      setGoogleEvents(prevEvents => {
        const mergedEvents = { ...prevEvents };
        
        Object.keys(canvasEvents).forEach(date => {
          if (!mergedEvents[date]) {
            mergedEvents[date] = { assignments: [] };
          }
          // Filter out Canvas events with the same id to prevent duplicates
          const existingEvents = mergedEvents[date].assignments || [];
          const canvasEventIds = canvasEvents[date].assignments.map(e => e.id);
          const filteredEvents = existingEvents.filter(existingEvent => 
            existingEvent.type !== 'CanvasAssignment' || !canvasEventIds.includes(existingEvent.id)
          );
          mergedEvents[date].assignments = [
            ...filteredEvents,
            ...canvasEvents[date].assignments
          ];
          console.log(`📊 Date ${date}: Filtered out ${existingEvents.length - filteredEvents.length} old CanvasAssignment(s), added ${canvasEvents[date].assignments.length} new CanvasAssignment(s)`);
        });
        
        console.log('📊 Merged Canvas events into googleEvents state');
        
        // Debug logging after Canvas merge
        console.log('📊 googleEvents state after Canvas merge:', JSON.stringify(mergedEvents, null, 2));
        console.log('📊 Total dates with events after Canvas merge:', Object.keys(mergedEvents).length);
        console.log('📊 Total events across all dates after Canvas merge:', Object.values(mergedEvents).reduce((total, dayEvents) => total + (dayEvents.assignments?.length || 0), 0));
        
        // Log summary to confirm no duplicates
        const totalCanvasEvents = Object.values(mergedEvents).reduce((total, dayEvents) => {
          return total + (dayEvents.assignments?.filter(event => event.type === 'CanvasAssignment').length || 0);
        }, 0);
        console.log(`📊 Summary: Total CanvasAssignment items after merge: ${totalCanvasEvents} (should equal ${canvasAssignmentCount})`);
        
        return mergedEvents;
      });

    } catch (error) {
      console.error('❌ Error fetching Canvas events:', error);
      Alert.alert('Canvas Error', `Failed to load Canvas assignments: ${error.message}`);
    }
  };

  // ============================================================================
  // CALENDAR DISPLAY FUNCTIONS - Functions that prepare data for calendar rendering
  // ============================================================================
  
  /**
   * getMarkedDates - Creates marked dates configuration for the calendar component
   * 
   * This function analyzes all events in googleEvents and creates visual markers
   * for the calendar component. It handles different event types with different colors:
   * 
   * Event Types and Colors:
   * - Manual assignments: Red dots (#ff6b6b) - user-created assignments
   * - Canvas assignments: Orange dots (#ff9800) - from Canvas LMS
   * - Google Calendar events: Blue dots (#2196f3) - from Google Calendar
   * - Google Apps Script events: Blue dots (#2196f3) - from Apps Script
   * 
   * The function also handles mixed event types on the same date by showing
   * multiple dots or combining colors appropriately.
   * 
   * @returns {Object} Marked dates configuration for react-native-calendars
   */
  const getMarkedDates = () => {
    const marked = {};
    let totalAssignments = 0;
    let totalGoogleEvents = 0;

    console.log('📅 Rendering calendar - analyzing events for marking...');
    console.log('📊 googleEvents state:', JSON.stringify(googleEvents, null, 2));

    // Analyze each date in googleEvents to determine visual markers
    Object.keys(googleEvents).forEach(date => {
      const dayEvents = googleEvents[date]?.assignments || [];
      
      console.log(`📅 Processing date ${date}: ${dayEvents.length} events`);
      
      // Collect all assignments (manual + Canvas + Google) for this date
      const allAssignments = dayEvents.filter(event => 
        event.type === 'assignment' || 
        event.type === 'CanvasAssignment' || 
        event.type === 'google' || 
        event.type === 'GoogleEvent'
      );
      
      if (allAssignments.length === 0) {
        console.log(`📅 No assignments found for date ${date}`);
        return;
      }
      
      // Count events by type for logging and processing
      const assignmentCount = dayEvents.filter(event => event.type === 'assignment').length;
      const googleEventCount = dayEvents.filter(event => event.type === 'google').length;
      const googleAppsScriptEventCount = dayEvents.filter(event => event.type === 'GoogleEvent').length;
      const canvasAssignmentCount = dayEvents.filter(event => event.type === 'CanvasAssignment').length;
      
      // Debug log for event type breakdown
      console.log(`🛠 Date ${date} breakdown:`, {
        google: googleEventCount,
        canvas: canvasAssignmentCount,
        manual: assignmentCount,
        appsScript: googleAppsScriptEventCount
      });
      
      totalAssignments += assignmentCount;
      totalGoogleEvents += googleEventCount + googleAppsScriptEventCount + canvasAssignmentCount;

      if (assignmentCount > 0) {
        console.log(`📝 Date ${date}: ${assignmentCount} assignment(s)`, 
          dayEvents.filter(event => event.type === 'assignment').map(a => a.title));
      }
      if (googleEventCount > 0) {
        console.log(`📅 Date ${date}: ${googleEventCount} Google Calendar event(s)`, 
          dayEvents.filter(event => event.type === 'google').map(g => g.title));
      }
      if (googleAppsScriptEventCount > 0) {
        console.log(`🔵 Date ${date}: ${googleAppsScriptEventCount} Google Apps Script event(s)`, 
          dayEvents.filter(event => event.type === 'GoogleEvent').map(g => g.title));
      }
      if (canvasAssignmentCount > 0) {
        console.log(`📘 Date ${date}: ${canvasAssignmentCount} Canvas assignment(s)`, 
          dayEvents.filter(event => event.type === 'CanvasAssignment').map(c => c.title));
      }

      // Create dots array with proper colors for each assignment type
      const dots = [];
      const seenTypes = new Set();
      
      allAssignments.forEach(event => {
        let dotColor = event.dotColor;
        
        // Determine dot color based on event type
        if (event.type === 'assignment') {
          // Manual assignments use priority-based colors
          dotColor = priorityColors[event.priority] || '#ff6b6b';
        } else if (event.type === 'CanvasAssignment') {
          dotColor = '#ff9800'; // Orange for Canvas assignments
        } else if (event.type === 'google') {
          dotColor = '#2196f3'; // Blue for Google Calendar events
        } else if (event.type === 'GoogleEvent') {
          dotColor = event.dotColor || '#2196f3'; // Use event's dotColor or default blue
        }
        
        // Only add unique dot colors to avoid duplicates
        if (!seenTypes.has(dotColor)) {
          dots.push({ 
            key: `${event.type}-${dotColor}`, 
            color: dotColor 
          });
          seenTypes.add(dotColor);
        }
      });
      
      // Create marked date configuration
      if (dots.length > 0) {
        marked[date] = {
          marked: true,
          dots: dots,
          customStyles: {
            container: {
              backgroundColor: dots[0].color + '20', // Use first dot color with transparency
              borderRadius: 8,
            },
            text: {
              color: dots[0].color,
              fontWeight: 'bold',
            },
          },
        };
        
        console.log(`🎨 Marked date ${date} with ${dots.length} dot(s):`, dots.map(d => d.color));
      }
    });

    // Mark selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#2196f3',
        selectedTextColor: '#ffffff',
      };
    }

    console.log(`📊 Calendar summary: ${totalAssignments} total assignments, ${totalGoogleEvents} total Google events`);
    console.log(`🎨 Marked ${Object.keys(marked).length} dates with events`);
    console.log('📊 Final marked dates:', JSON.stringify(marked, null, 2));

    return marked;
  };

  const getEventsForSelectedDate = () => {
    // Get all events for the selected date from the unified structure
    const dateEvents = googleEvents[selectedDate]?.assignments || [];
    return dateEvents;
  };

  const toggleAssignmentCompletion = async (assignmentId, dueDate) => {
    console.log('Toggling completion for assignment:', assignmentId);
    
    // Find the assignment to get its notification IDs
    const assignment = googleEvents[dueDate]?.assignments?.find(a => a.id === assignmentId);
    const isCompleting = !assignment?.completed;
    
    // If completing, cancel notifications
    if (isCompleting && assignment?.notificationIds?.length > 0) {
      await cancelAssignmentNotifications(assignment.notificationIds);
    }
    
    // Update manual assignments
    setManualAssignments(prevAssignments => ({
      ...prevAssignments,
      [dueDate]: {
        ...prevAssignments[dueDate],
        assignments: prevAssignments[dueDate]?.assignments.map(assignment => 
          assignment.id === assignmentId 
            ? { ...assignment, completed: !assignment.completed }
            : assignment
        ) || []
      }
    }));

    // Update unified events structure
    setGoogleEvents(prevEvents => ({
      ...prevEvents,
      [dueDate]: {
        ...prevEvents[dueDate],
        assignments: prevEvents[dueDate]?.assignments.map(assignment => 
          assignment.id === assignmentId 
            ? { ...assignment, completed: !assignment.completed }
            : assignment
        ) || []
      }
    }));

    console.log(`Assignment completion toggled: ${assignment?.title} - ${isCompleting ? 'completed' : 'uncompleted'}`);
  };

  // ============================================================================
  // LIST VIEW FUNCTIONS - Functions that prepare data for assignment list display
  // ============================================================================
  
  /**
   * getAllAssignments - Extracts all assignments from googleEvents for list view
   * 
   * This function:
   * 1. Iterates through all dates in googleEvents
   * 2. Extracts events that are assignments (manual or Canvas)
   * 3. Adds the dueDate field to each assignment
   * 4. Returns a flat array of all assignments for sorting/display
   * 
   * Assignment Types Included:
   * - 'assignment': Manual assignments created by user
   * - 'CanvasAssignment': Canvas assignments from ICS feed
   * 
   * @returns {Array} Flat array of all assignments with dueDate field
   */
  const getAllAssignments = () => {
    const allAssignments = [];
    
    // Iterate through all dates in googleEvents
    Object.keys(googleEvents).forEach(date => {
      const dayEvents = googleEvents[date]?.assignments || [];
      
      // Extract assignments from this date
      dayEvents.forEach(event => {
        if (event.type === 'assignment' || event.type === 'CanvasAssignment') {
          // Add dueDate field and include in results
          allAssignments.push({ ...event, dueDate: date });
        }
      });
    });
    
    return allAssignments;
  };

  const getSortedAssignments = () => {
    const assignments = getAllAssignments();
    
    switch (sortBy) {
      case 'class':
        return assignments.sort((a, b) => (a.course || '').localeCompare(b.course || ''));
      case 'type':
        return assignments.sort((a, b) => (a.assignmentType || '').localeCompare(b.assignmentType || ''));
      case 'priority':
        return assignments.sort((a, b) => {
          const priorityOrder = { High: 3, Medium: 2, Low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return new Date(a.dueDate) - new Date(b.dueDate); // Then by date
        });
      case 'category':
        return assignments.sort((a, b) => {
          const categoryA = a.category || 'Other';
          const categoryB = b.category || 'Other';
          const categoryDiff = categoryA.localeCompare(categoryB);
          if (categoryDiff !== 0) return categoryDiff;
          return new Date(a.dueDate) - new Date(b.dueDate); // Then by date
        });
      case 'date':
      default:
        return assignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }
  };

  const handleSortChange = (newSortBy) => {
    console.log('Sort changed to:', newSortBy);
    setSortBy(newSortBy);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'web') {
      // For web, event.target.value contains the date string
      const dateValue = event.target.value;
      console.log('Web date picker changed:', dateValue);
      setNewAssignment({...newAssignment, dueDate: dateValue});
    } else {
      // For mobile (iOS/Android)
      setShowDatePicker(false);
      if (selectedDate) {
        const formattedDate = selectedDate.toISOString().split('T')[0];
        console.log('Mobile date picker changed:', formattedDate);
        setNewAssignment({...newAssignment, dueDate: formattedDate});
      }
    }
  };

  const addNewAssignment = async () => {
    console.log('➕ Add assignment button clicked');
    
    if (!newAssignment.title || !newAssignment.dueDate) {
      console.log('❌ Missing required fields:', { title: !!newAssignment.title, dueDate: !!newAssignment.dueDate });
      Alert.alert('Error', 'Please fill in assignment title and due date');
      return;
    }

    console.log('✅ Adding new assignment:', {
      title: newAssignment.title,
      dueDate: newAssignment.dueDate,
      course: newAssignment.course,
      assignmentType: newAssignment.assignmentType,
      time: newAssignment.time
    });
    
    const dueDate = newAssignment.dueDate;
    const assignment = {
      title: newAssignment.title,
      description: newAssignment.description,
      time: newAssignment.time,
      course: newAssignment.course,
      assignmentType: newAssignment.assignmentType,
      type: 'assignment',
      completed: false,
      priority: newAssignment.priority,
      dotColorByPriority: priorityColors[newAssignment.priority],
      dotColor: priorityColors[newAssignment.priority], // Add dotColor for calendar display
      id: Date.now(), // Add unique ID for tracking
      notificationIds: [] // Will be populated after scheduling
    };

    // Schedule notifications
    const notificationIds = await scheduleAssignmentNotifications(assignment);
    assignment.notificationIds = notificationIds;

    // Add assignment to manual assignments
    setManualAssignments(prevAssignments => ({
      ...prevAssignments,
      [dueDate]: {
        ...prevAssignments[dueDate],
        assignments: [
          ...(prevAssignments[dueDate]?.assignments || []),
          assignment
        ]
      }
    }));

    // Update the unified events structure with the correct format for calendar dots
    setGoogleEvents(prevEvents => ({
      ...prevEvents,
      [dueDate]: {
        ...prevEvents[dueDate],
        assignments: [
          ...(prevEvents[dueDate]?.assignments || []),
          assignment
        ]
      }
    }));

    // Log assignment details to console
    console.log('Assignment Added:', {
      title: newAssignment.title,
      type: newAssignment.assignmentType,
      dueDate: newAssignment.dueDate
    });

    // Reset form and close modal
    setNewAssignment({
      title: '',
      description: '',
      dueDate: '',
      time: '23:59',
      course: '',
      assignmentType: '',
      priority: 'Medium'
    });
    setShowAddModal(false);
    Alert.alert('Success', 'Assignment added successfully!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Study Calendar</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.addButton, styles.refreshButton]}
          onPress={() => {
            console.log('🔄 Refresh Calendar & Canvas button clicked');
            fetchGoogleEvents();
            fetchGoogleCalendarEventsData();
            fetchCanvasEvents();
          }}
          disabled={!isGoogleSignedIn}
        >
          <Text style={styles.addButtonText}>🔄 Refresh Calendar & Canvas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            console.log('➕ Add Assignment button clicked');
            setShowAddModal(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Add Assignment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addButton, styles.viewToggleButton]}
          onPress={() => {
            const newView = currentView === 'calendar' ? 'list' : 'calendar';
            console.log('View toggle clicked:', newView);
            setCurrentView(newView);
          }}
        >
          <Text style={styles.addButtonText}>
            {currentView === 'calendar' ? '📋 List View' : '📅 Calendar View'}
          </Text>
        </TouchableOpacity>

        {!isGoogleSignedIn ? (
          <TouchableOpacity
            style={[styles.addButton, styles.googleButton]}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            <Text style={styles.addButtonText}>
              {isGoogleLoading ? '⏳ Loading...' : '📅 Connect Google Calendar'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, styles.googleButton, styles.googleSignedInButton]}
            onPress={handleGoogleSignOut}
          >
            <Text style={styles.addButtonText}>🔒 Disconnect Google Calendar</Text>
          </TouchableOpacity>
        )}
      </View>

      {currentView === 'calendar' ? (
        <>
          <Calendar
            style={styles.calendar}
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#2196f3',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#2196f3',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: '#2196f3',
              selectedDotColor: '#ffffff',
              arrowColor: '#2196f3',
              monthTextColor: '#2196f3',
              indicatorColor: '#2196f3',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13,
            }}
          />

          <ScrollView style={styles.eventsContainer}>
            <Text style={styles.eventsTitle}>
              Events for {new Date(selectedDate).toLocaleDateString()}
            </Text>

            {getEventsForSelectedDate().length === 0 ? (
              <Text style={styles.noEvents}>No events scheduled for this date</Text>
            ) : (
              getEventsForSelectedDate().map((event, index) => (
                <View
                  key={event.id || index}
                  style={[
                    styles.eventItem,
                    event.type === 'assignment' ? styles.assignmentEvent :
                    event.type === 'study' ? styles.studyEvent :
                    styles.googleEvent,
                    event.completed && styles.completedEvent
                  ]}
                >
                  {event.type === 'assignment' && (
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => toggleAssignmentCompletion(event.id, selectedDate)}
                    >
                      <Text style={styles.checkboxText}>
                        {event.completed ? '✅' : '☐'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.eventContent}>
                    <Text style={[
                      styles.eventTitle,
                      event.completed && styles.completedText
                    ]}>
                      {event.title}
                    </Text>
                    <Text style={styles.eventTime}>
                      {event.time}
                      {event.endTime && event.type === 'google' && ` - ${event.endTime}`}
                    </Text>
                    {event.description && (
                      <Text style={styles.eventDescription}>{event.description}</Text>
                    )}
                    {event.course && event.type === 'assignment' && (
                      <Text style={styles.eventCourse}>📚 Course: {event.course}</Text>
                    )}
                    {event.assignmentType && event.type === 'assignment' && (
                      <Text style={styles.eventAssignmentType}>📋 Type: {event.assignmentType}</Text>
                    )}
                    {event.priority && event.type === 'assignment' && (
                      <View style={[styles.priorityBadge, { backgroundColor: event.dotColorByPriority }]}>
                        <Text style={styles.priorityBadgeText}>{event.priority}</Text>
                      </View>
                    )}
                    {event.category && event.type === 'GoogleEvent' && (
                      <View style={[styles.categoryBadge, { backgroundColor: event.dotColor }]}>
                        <Text style={styles.categoryBadgeText}>{event.category}</Text>
                      </View>
                    )}
                    {event.type === 'CanvasAssignment' && (
                      <View style={[styles.canvasBadge, { backgroundColor: event.dotColor }]}>
                        <Text style={styles.canvasBadgeText}>📘 Canvas</Text>
                      </View>
                    )}
                    {event.location && event.type === 'google' && (
                      <Text style={styles.eventLocation}>📍 {event.location}</Text>
                    )}
                    {event.duration && (
                      <Text style={styles.eventDuration}>Duration: {event.duration}</Text>
                    )}
                    <View style={[
                      styles.eventTypeBadge,
                      event.type === 'assignment' ? styles.assignmentBadge :
                      event.type === 'study' ? styles.studyBadge :
                      styles.googleBadge
                    ]}>
                      <Text style={styles.eventTypeText}>
                        {event.type === 'assignment' ? 'Assignment' :
                         event.type === 'study' ? 'Study Block' :
                         event.type === 'CanvasAssignment' ? 'Canvas Assignment' :
                         event.type === 'GoogleEvent' ? 'Google Event' :
                         'Google Event'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </>
      ) : (
        <ScrollView style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>All Assignments</Text>
            <View style={styles.sortContainer}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              <Picker
                selectedValue={sortBy}
                style={styles.sortPicker}
                onValueChange={handleSortChange}
              >
                <Picker.Item label="Date" value="date" />
                <Picker.Item label="Class" value="class" />
                <Picker.Item label="Type" value="type" />
                <Picker.Item label="Priority" value="priority" />
                <Picker.Item label="Category" value="category" />
              </Picker>
            </View>
          </View>

          {getSortedAssignments().length === 0 ? (
            <Text style={styles.noEvents}>No assignments found</Text>
          ) : (
            getSortedAssignments().map((assignment, index) => (
              <View
                key={assignment.id || index}
                style={[
                  styles.listItem,
                  assignment.completed && styles.completedListItem
                ]}
              >
                <TouchableOpacity
                  style={styles.listCheckbox}
                  onPress={() => toggleAssignmentCompletion(assignment.id, assignment.dueDate)}
                >
                  <Text style={styles.checkboxText}>
                    {assignment.completed ? '✅' : '☐'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.listItemContent}>
                  <Text style={[
                    styles.listItemTitle,
                    assignment.completed && styles.completedText
                  ]}>
                    {assignment.title}
                  </Text>
                  <Text style={styles.listItemDate}>
                    📅 {new Date(assignment.dueDate).toLocaleDateString()}
                  </Text>
                  <Text style={styles.listItemType}>
                    📋 {assignment.assignmentType || 'Assignment'}
                  </Text>
                  <Text style={styles.listItemCourse}>
                    📚 {assignment.course || 'No Course'}
                  </Text>
                  {assignment.priority && (
                    <View style={[styles.priorityBadge, { backgroundColor: assignment.dotColorByPriority }]}>
                      <Text style={styles.priorityBadgeText}>{assignment.priority}</Text>
                    </View>
                  )}
                  {assignment.category && assignment.type === 'GoogleEvent' && (
                    <View style={[styles.categoryBadge, { backgroundColor: assignment.dotColor }]}>
                      <Text style={styles.categoryBadgeText}>{assignment.category}</Text>
                    </View>
                  )}
                  {assignment.type === 'CanvasAssignment' && (
                    <View style={[styles.canvasBadge, { backgroundColor: assignment.dotColor }]}>
                      <Text style={styles.canvasBadgeText}>📘 Canvas</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add Assignment Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Assignment</Text>

            <TextInput
              style={styles.input}
              placeholder="Assignment Title"
              value={newAssignment.title}
              onChangeText={(text) => setNewAssignment({...newAssignment, title: text})}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (Optional)"
              value={newAssignment.description}
              onChangeText={(text) => setNewAssignment({...newAssignment, description: text})}
            />
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={newAssignment.dueDate}
                onChange={handleDateChange}
                style={styles.webDateInput}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.datePickerText}>
                    {newAssignment.dueDate || 'Select Due Date'}
                  </Text>
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={newAssignment.dueDate ? new Date(newAssignment.dueDate) : new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                  />
                )}
              </>
            )}
            <TextInput
              style={styles.input}
              placeholder="Time (HH:MM, e.g., 23:59)"
              value={newAssignment.time}
              onChangeText={(text) => setNewAssignment({...newAssignment, time: text})}
            />

            {/* Course Dropdown */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Course:</Text>
              <Picker
                selectedValue={newAssignment.course}
                style={styles.picker}
                onValueChange={(itemValue) => setNewAssignment({...newAssignment, course: itemValue})}
              >
                {courseOptions.map((option) => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>

            {/* Assignment Type Dropdown */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Assignment Type:</Text>
              <Picker
                selectedValue={newAssignment.assignmentType}
                style={styles.picker}
                onValueChange={(itemValue) => setNewAssignment({...newAssignment, assignmentType: itemValue})}
              >
                {assignmentTypeOptions.map((option) => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>

            {/* Priority Dropdown */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Priority:</Text>
              <Picker
                selectedValue={newAssignment.priority}
                style={styles.picker}
                onValueChange={(itemValue) => setNewAssignment({...newAssignment, priority: itemValue})}
              >
                {priorityOptions.map((option) => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={addNewAssignment}
              >
                <Text style={styles.modalButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
  },
  refreshButton: {
    backgroundColor: '#6c757d', // Grey for refresh
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButton: {
    backgroundColor: '#2196f3', // Blue button
  },
  googleSignedInButton: {
    backgroundColor: '#4caf50', // Green when signed in
  },
  viewToggleButton: {
    backgroundColor: '#9c27b0', // Purple for view toggle
  },
  calendar: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  eventsContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  eventsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  noEvents: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
  eventItem: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'column',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  assignmentEvent: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b', // Red border
  },
  studyEvent: {
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50', // Green border
  },
  googleEvent: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3', // Blue border
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  eventDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  eventTime: {
    fontSize: 14,
    color: '#777',
    marginBottom: 5,
  },
  eventLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  eventCourse: {
    fontSize: 12,
    color: '#4a5568',
    marginBottom: 4,
    fontWeight: '500',
  },
  eventAssignmentType: {
    fontSize: 12,
    color: '#4a5568',
    marginBottom: 8,
    fontWeight: '500',
  },
  eventDuration: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  eventTypeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 15,
    marginTop: 8,
  },
  assignmentBadge: {
    backgroundColor: '#ffebee', // Light red background
  },
  studyBadge: {
    backgroundColor: '#e8f5e8', // Light green background
  },
  googleBadge: {
    backgroundColor: '#e3f2fd', // Light blue background
  },
  eventTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  picker: {
    height: 50,
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 5,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 10,
  },
  webDateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    width: '100%',
    backgroundColor: '#ffffff',
  },
  // List View Styles
  listContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  sortPicker: {
    height: 40,
    width: 120,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 5,
  },
  listItem: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  completedListItem: {
    backgroundColor: '#f8f9fa',
    opacity: 0.7,
  },
  listCheckbox: {
    marginRight: 12,
    marginTop: 2,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  listItemDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  listItemType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  listItemCourse: {
    fontSize: 14,
    color: '#666',
  },
  // Checkbox and Completion Styles
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  checkboxText: {
    fontSize: 18,
    color: '#333',
  },
  completedEvent: {
    backgroundColor: '#f8f9fa',
    opacity: 0.7,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  eventContent: {
    flex: 1,
  },
  priorityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  categoryBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  canvasBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  canvasBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});