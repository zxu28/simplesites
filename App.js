import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity, Modal, Picker, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import * as Notifications from 'expo-notifications';
import { 
  GOOGLE_CONFIG,
  debugGoogleConfig,
  validateGoogleConfig
} from './config/google';

console.log('📱 App.js loaded successfully');

// Google Apps Script URL for fetching events
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby12GiVuGImRqu16g4sOr5h6l-ptx3SqPGhve7H-jhNe8wzIrn8tib3cedPLN3t4F5O/exec";

// Configure WebBrowser for OAuth (only for web)
if (typeof window !== 'undefined') {
  try {
    const WebBrowser = require('expo-web-browser');
    WebBrowser.maybeCompleteAuthSession();
    console.log('✅ WebBrowser configured for OAuth');
  } catch (error) {
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

export default function App() {
  // Manual assignments that users can add
  const [manualAssignments, setManualAssignments] = useState({});
  // Google Calendar events
  const [googleEvents, setGoogleEvents] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentView, setCurrentView] = useState('calendar'); // 'calendar' or 'list'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'class', 'type'
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dueDate: '',
    time: '23:59',
    course: '',
    assignmentType: '',
    priority: 'Medium' // Default priority
  });
  
  // Google Calendar state
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [accessToken, setAccessToken] = useState(null);

  // Dropdown options for assignments
  // TODO: Extend these arrays to add more courses or assignment types
  const courseOptions = [
    { label: 'Select Course', value: '' },
    { label: 'Math', value: 'math' },
    { label: 'English', value: 'english' },
    { label: 'History', value: 'history' },
    { label: 'Science', value: 'science' },
    { label: 'Art', value: 'art' },
    { label: 'Music', value: 'music' },
    { label: 'Physical Education', value: 'pe' },
    { label: 'Other', value: 'other' }
  ];

  const assignmentTypeOptions = [
    { label: 'Select Type', value: '' },
    { label: 'Homework', value: 'Homework' },
    { label: 'Project', value: 'Project' },
    { label: 'Test', value: 'Test' }
  ];

  const priorityOptions = [
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' }
  ];

  // Priority color mapping - change colors here
  const priorityColors = {
    High: '#e53935',    // Red
    Medium: '#fb8c00',  // Orange  
    Low: '#43a047'      // Green
  };

  // Configure redirect URI for OAuth
  const redirectUri = makeRedirectUri({});
  console.log('🔗 OAuth Redirect URI:', redirectUri);
  console.log('🌐 Current Origin:', typeof window !== 'undefined' ? window.location.origin : 'Native');

  // Utility function to compute trigger date - change reminder offsets here
  const toLocalTriggerDate = (dueDateYYYYMMDD, daysBefore, hour = 17) => {
    const dueDate = new Date(dueDateYYYYMMDD);
    const triggerDate = new Date(dueDate);
    triggerDate.setDate(triggerDate.getDate() - daysBefore);
    triggerDate.setHours(hour, 0, 0, 0);
    
    // Clamp to future only
    const now = new Date();
    if (triggerDate <= now) {
      triggerDate.setTime(now.getTime() + 60000); // 1 minute from now
    }
    
    return triggerDate;
  };

  // Request notification permissions
  const requestNotificationPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }
      return true;
    } catch (error) {
      console.warn('Failed to request notification permissions:', error);
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

  // Categorize events by title keywords
  const categorizeEvent = (title) => {
    const titleLower = title.toLowerCase();
    
    // Classes
    if (titleLower.includes('hon') || titleLower.includes('humanities') || 
        titleLower.includes('math') || titleLower.includes('calculus') || 
        titleLower.includes('physics') || titleLower.includes('spanish')) {
      return { category: 'Classes', dotColor: '#1e88e5' };
    }
    
    // Sports/Activities
    if (titleLower.includes('cross country') || titleLower.includes('ath') || 
        titleLower.includes('practice')) {
      return { category: 'Sports/Activities', dotColor: '#43a047' };
    }
    
    // Meetings/Chapel/Advisory
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
      
      if (!data || !Array.isArray(data)) {
        console.log('No events found');
        return;
      }
      
      // Map events to our format with categorization
      const googleEvents = data.map(ev => {
        const categorization = categorizeEvent(ev.title);
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
          id: ev.id || Date.now() + Math.random() // Generate unique ID if not provided
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
          
          // Add Google event to the assignments array
          mergedEvents[dateKey].assignments = [
            ...(mergedEvents[dateKey].assignments || []),
            event
          ];
        });
        
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
    
    console.log('=== App initialization complete ===');
    
    // Fetch Google Apps Script events on initial load
    fetchGoogleEvents();
    
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

  // Handle OAuth response
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
      setIsGoogleSignedIn(true);
      // Fetch events after successful authentication
      fetchGoogleCalendarEventsData(authentication.accessToken);
    } else if (response?.type === 'error') {
      console.error('❌ OAuth error response:', response.error);
      Alert.alert('Google OAuth Error', `Failed to connect to Google Calendar: ${response.error?.message || 'Unknown error'}`);
    } else if (response?.type === 'cancel') {
      console.log('OAuth cancelled by user');
    }
  }, [response]);

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

  const fetchGoogleCalendarEventsData = async (token = accessToken) => {
    console.log('🔄 fetchGoogleCalendarEventsData called');
    console.log('Token available:', !!token);
    
    if (!token) {
      console.log('❌ No access token available, skipping calendar fetch');
      return;
    }

    try {
      console.log('🔄 Fetching Google Calendar events...');
      
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // Next 90 days
      
      console.log('📅 Time range:', { timeMin, timeMax });
      
      // Call Google Calendar API directly with user's access token
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&showDeleted=false&singleEvents=true&orderBy=startTime&maxResults=100`;
      
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
      
      console.log('✅ Google Calendar events received:', googleEventsList.length, 'events');
      
      if (googleEventsList.length === 0) {
        console.log('📝 No events found in Google Calendar');
      }
      
      // Create unified events structure that combines Google Calendar events and manual assignments
      const unifiedEvents = { ...manualAssignments };
      
      // Debug counters
      let canvasAssignmentCount = 0;
      let redEventCount = 0;
      let keywordCanvasCount = 0;
      let regularGoogleEventCount = 0;
      
      googleEventsList.forEach(event => {
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
        
        // Primary detection: Check for colorId = '11' (red blocks)
        const isRedEvent = event.colorId === '11';
        
        // Secondary detection: Keyword-based Canvas assignment detection (fallback)
        const isCanvasByKeyword = (title, description) => {
          const text = `${title || ''} ${description || ''}`.toLowerCase();
          return text.includes('assignment') || text.includes('homework') || 
                 text.includes('quiz') || text.includes('essay') || text.includes('project');
        };
        
        // Determine if this is a Canvas assignment
        const isCanvas = isRedEvent || isCanvasByKeyword(eventTitle, eventDescription);
        
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
        
        // Add Google event to unified events structure
        unifiedEvents[dateKey] = {
          ...unifiedEvents[dateKey],
          assignments: [
            ...(unifiedEvents[dateKey]?.assignments || []),
            {
              title: eventTitle,
              description: eventDescription,
              time: eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              endTime: endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: isCanvas ? 'CanvasAssignment' : 'google',
              category: isCanvas ? 'Canvas Assignment' : 'Google Event',
              dotColor: isCanvas ? '#ff9800' : '#2196f3',
              location: event.location || '',
              htmlLink: event.htmlLink || '',
              id: event.id,
              colorId: event.colorId // Store original colorId for debugging
            }
          ]
        };
      });
      
      // Debug logging for Canvas assignments
      console.log(`📊 Google Calendar breakdown: ${canvasAssignmentCount} total Canvas assignments`);
      console.log(`🔴 Red events (colorId='11'): ${redEventCount}`);
      console.log(`📝 Keyword-detected Canvas: ${keywordCanvasCount}`);
      console.log(`📅 Other Google events: ${regularGoogleEventCount}`);

      console.log('📊 Parsed Google events into unified structure:', Object.keys(unifiedEvents).length, 'dates');
      console.log('📋 Total events across all dates:', Object.values(unifiedEvents).reduce((total, dayEvents) => total + (dayEvents.assignments?.length || 0), 0));
      
      // Update the unified events state
      setGoogleEvents(unifiedEvents);

    } catch (error) {
      console.error('❌ Error fetching Google Calendar events:', error);
      let errorMessage = `Failed to load Google Calendar events: ${error.message}`;
      
      Alert.alert('Google Calendar Error', errorMessage);
    }
  };

  const getMarkedDates = () => {
    const marked = {};
    let totalAssignments = 0;
    let totalGoogleEvents = 0;

    console.log('📅 Rendering calendar - analyzing events for marking...');

    // Mark dates with events (both Google Calendar events and manual assignments)
    Object.keys(googleEvents).forEach(date => {
      const dayEvents = googleEvents[date]?.assignments || [];
      const hasGoogleEvents = dayEvents.some(event => event.type === 'google');
      const hasGoogleAppsScriptEvents = dayEvents.some(event => event.type === 'GoogleEvent');
      const hasCanvasAssignments = dayEvents.some(event => event.type === 'CanvasAssignment');
      const hasManualAssignments = dayEvents.some(event => event.type === 'assignment');
      
      const assignmentCount = dayEvents.filter(event => event.type === 'assignment').length;
      const googleEventCount = dayEvents.filter(event => event.type === 'google').length;
      const googleAppsScriptEventCount = dayEvents.filter(event => event.type === 'GoogleEvent').length;
      const canvasAssignmentCount = dayEvents.filter(event => event.type === 'CanvasAssignment').length;
      
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

      if (hasGoogleEvents && hasManualAssignments) {
        // Both Google Calendar events and manual assignments
        marked[date] = {
          marked: true,
          dots: [
            { key: 'google', color: '#2196f3' },
            { key: 'assignment', color: '#ff6b6b' }
          ],
          customStyles: {
            container: {
              backgroundColor: '#e3f2fd',
              borderRadius: 8,
            },
            text: {
              color: '#1976d2',
              fontWeight: 'bold',
            },
          },
        };
      } else if (hasGoogleAppsScriptEvents && hasManualAssignments) {
        // Both Google Apps Script events and manual assignments
        const googleAppsScriptEvents = dayEvents.filter(event => event.type === 'GoogleEvent');
        const primaryColor = googleAppsScriptEvents[0]?.dotColor || '#9e9e9e';
        
        marked[date] = {
          marked: true,
          dots: [
            { key: 'googleAppsScript', color: primaryColor },
            { key: 'assignment', color: '#ff6b6b' }
          ],
          customStyles: {
            container: {
              backgroundColor: primaryColor + '20',
              borderRadius: 8,
            },
            text: {
              color: primaryColor,
              fontWeight: 'bold',
            },
          },
        };
      } else if (hasGoogleEvents) {
        // Only Google Calendar events
        marked[date] = {
          marked: true,
          dotColor: '#2196f3',
          customStyles: {
            container: {
              backgroundColor: '#e3f2fd',
              borderRadius: 8,
            },
            text: {
              color: '#1976d2',
              fontWeight: 'bold',
            },
          },
        };
      } else if (hasGoogleAppsScriptEvents) {
        // Only Google Apps Script events - use category colors
        const googleAppsScriptEvents = dayEvents.filter(event => event.type === 'GoogleEvent');
        const primaryCategory = googleAppsScriptEvents[0]?.category || 'Other';
        const primaryColor = googleAppsScriptEvents[0]?.dotColor || '#9e9e9e';
        
        marked[date] = {
          marked: true,
          dotColor: primaryColor,
          customStyles: {
            container: {
              backgroundColor: primaryColor + '20', // Add transparency
              borderRadius: 8,
            },
            text: {
              color: primaryColor,
              fontWeight: 'bold',
            },
          },
        };
      } else if (hasCanvasAssignments && hasManualAssignments) {
        // Both Canvas assignments and manual assignments
        const canvasEvents = dayEvents.filter(event => event.type === 'CanvasAssignment');
        const canvasColor = canvasEvents[0]?.dotColor || '#ff9800';
        
        marked[date] = {
          marked: true,
          dots: [
            { key: 'canvas', color: canvasColor },
            { key: 'assignment', color: '#ff6b6b' }
          ],
          customStyles: {
            container: {
              backgroundColor: canvasColor + '20',
              borderRadius: 8,
            },
            text: {
              color: canvasColor,
              fontWeight: 'bold',
            },
          },
        };
      } else if (hasCanvasAssignments) {
        // Only Canvas assignments
        const canvasEvents = dayEvents.filter(event => event.type === 'CanvasAssignment');
        const canvasColor = canvasEvents[0]?.dotColor || '#ff9800';
        
        marked[date] = {
          marked: true,
          dotColor: canvasColor,
          customStyles: {
            container: {
              backgroundColor: canvasColor + '20',
              borderRadius: 8,
            },
            text: {
              color: canvasColor,
              fontWeight: 'bold',
            },
          },
        };
      } else if (hasManualAssignments) {
        // Only manual assignments - use priority color
        const assignments = dayEvents.filter(event => event.type === 'assignment');
        const highestPriority = assignments.reduce((highest, assignment) => {
          const priorityOrder = { High: 3, Medium: 2, Low: 1 };
          return priorityOrder[assignment.priority] > priorityOrder[highest] ? assignment.priority : highest;
        }, 'Low');
        
        marked[date] = {
          marked: true,
          dotColor: priorityColors[highestPriority],
          customStyles: {
            container: {
              backgroundColor: priorityColors[highestPriority] + '20', // Add transparency
              borderRadius: 8,
            },
            text: {
              color: priorityColors[highestPriority],
              fontWeight: 'bold',
            },
          },
        };
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

  const getAllAssignments = () => {
    const allAssignments = [];
    Object.keys(googleEvents).forEach(date => {
      const dayEvents = googleEvents[date]?.assignments || [];
      dayEvents.forEach(event => {
        if (event.type === 'assignment') {
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
            console.log('🔄 Refresh Google Calendar button clicked');
            fetchGoogleCalendarEventsData();
          }}
          disabled={!isGoogleSignedIn}
        >
          <Text style={styles.addButtonText}>🔄 Refresh Google Calendar</Text>
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