import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import ICAL from 'ical.js';
import { CANVAS_CONFIG, buildCanvasUrl } from './config/canvas';
import { 
  initializeGoogleAPI, 
  signInToGoogle, 
  signOutOfGoogle, 
  isSignedInToGoogle, 
  fetchGoogleCalendarEvents,
  debugGoogleConfig
} from './config/google';
import { gapi } from 'gapi-script';

// Sample Canvas ICS feed URL (you can replace this with a real one)
const SAMPLE_ICS_URL = 'https://canvas.instructure.com/feeds/calendars/user_1234567890.ics';

export default function App() {
  const [events, setEvents] = useState({});
  const [studyBlocks, setStudyBlocks] = useState({});
  const [googleEvents, setGoogleEvents] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dueDate: '',
    time: '23:59'
  });
  
  // Google Calendar state
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleApiInitialized, setGoogleApiInitialized] = useState(false);

  useEffect(() => {
    console.log('=== App Component Mounted ===');
    
    // Test if Google API script is loaded
    console.log('Testing Google API script loading...');
    console.log('window.gapi exists:', Boolean(window.gapi));
    console.log('window.gapi.load exists:', Boolean(window.gapi?.load));
    
    // Debug Google configuration
    debugGoogleConfig();
    
    // Initialize Google API
    initializeGoogleAPI()
      .then(() => {
        setGoogleApiInitialized(true);
        setIsGoogleSignedIn(isSignedInToGoogle());
        console.log('✅ Google API initialized successfully');
        console.log('Auth instance available:', Boolean(window.gapi?.auth2));
      })
      .catch((error) => {
        console.error('❌ Failed to initialize Google API:', error);
        Alert.alert(
          'Google Calendar Setup Required', 
          `Please configure Google Calendar integration:\n\n${error.message}\n\nCheck the console for detailed setup instructions.`
        );
      });

    // Fetch Canvas events
    fetchCalendarEvents().catch((err) => {
      console.error("Fallback to sample data due to error:", err);
      loadSampleData();
    });
  }, []);

  const fetchCalendarEvents = async () => {
    try {
      console.log('Fetching Canvas calendar events...');
      
      // Fetch calendar events from Canvas API
      const calendarUrl = buildCanvasUrl(CANVAS_CONFIG.endpoints.calendarEvents, {
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Next 90 days
      });
      
      console.log('Canvas API URL:', calendarUrl);
      
      const response = await fetch(calendarUrl, {
        headers: {
          'Authorization': `Bearer ${CANVAS_CONFIG.apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
      }
      
      const canvasEvents = await response.json();
      console.log('Canvas events received:', canvasEvents.length);
      console.log('First Canvas event:', JSON.stringify(canvasEvents[0], null, 2));
      
      const parsedEvents = {};
      const generatedStudyBlocks = {};

      canvasEvents.forEach(event => {
        // Only process assignment events
        if (event.type === 'assignment' || event.assignment_id) {
          // Use multiple possible due date fields in order of preference
          const dueDateTime = event.assignment?.due_at || event.end_at || event.start_at;
          const dueDate = new Date(dueDateTime).toISOString().split('T')[0];
          
          // Add assignment to events
          parsedEvents[dueDate] = {
            ...parsedEvents[dueDate],
            assignments: [
              ...(parsedEvents[dueDate]?.assignments || []),
              {
                title: event.title || event.name,
                description: event.description || 'Assignment due',
                time: new Date(dueDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'assignment',
                courseName: event.context_name || event.assignment?.course_id || 'Course'
              }
            ]
          };

          // Generate study block for the day before using the same dueDateTime
          const studyDate = new Date(dueDateTime);
          studyDate.setDate(studyDate.getDate() - 1);
          const studyDateKey = studyDate.toISOString().split('T')[0];
          
          generatedStudyBlocks[studyDateKey] = {
            ...generatedStudyBlocks[studyDateKey],
            studyBlocks: [
              ...(generatedStudyBlocks[studyDateKey]?.studyBlocks || []),
              {
                title: `Study for ${event.title || event.name}`,
                time: '19:00',
                duration: '1 hour',
                type: 'study'
              }
            ]
          };
        }
      });

      console.log('Parsed events:', Object.keys(parsedEvents).length);
      console.log('Generated study blocks:', Object.keys(generatedStudyBlocks).length);

      setEvents(parsedEvents);
      setStudyBlocks(generatedStudyBlocks);
      
      Alert.alert('Success', `Loaded ${canvasEvents.length} events from Canvas!`);
      
    } catch (error) {
      console.error('Error fetching Canvas events:', error);
      Alert.alert('Error', `Failed to load Canvas events: ${error.message}`);
      console.log("Loading sample data after Canvas fetch error...");
      loadSampleData();
    }
  };

  const loadSampleData = () => {
    console.log('Loading sample data as fallback...');
    const sampleICSContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Canvas LMS//NONSGML v1.0//EN
BEGIN:VEVENT
DTSTART:20241215T235900Z
DTEND:20241216T000000Z
SUMMARY:Math Assignment Due
DESCRIPTION:Complete calculus problem set
LOCATION:Online
END:VEVENT
BEGIN:VEVENT
DTSTART:20241218T235900Z
DTEND:20241219T000000Z
SUMMARY:History Essay Due
DESCRIPTION:Write 5-page essay on World War II
LOCATION:Online
END:VEVENT
BEGIN:VEVENT
DTSTART:20241220T235900Z
DTEND:20241221T000000Z
SUMMARY:Science Lab Report Due
DESCRIPTION:Complete chemistry lab analysis
LOCATION:Online
END:VEVENT
END:VCALENDAR`;

    const jcalData = ICAL.parse(sampleICSContent);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    const parsedEvents = {};
    const generatedStudyBlocks = {};

    vevents.forEach(vevent => {
      const event = new ICAL.Event(vevent);
      // Use the same assignment parsing structure as fetchCalendarEvents
      // Check for possible due date fields in order: event.assignment?.due_at, event.end_at, event.start_at
      // For ICS, we only have DTSTART and DTEND, so simulate as if they are like start_at and end_at
      // This allows consistent logic for both Canvas and ICS sample events
      const start_at = event.startDate ? event.startDate.toJSDate() : null;
      const end_at = event.endDate ? event.endDate.toJSDate() : null;
      // Simulate Canvas "assignment" object (not present in ICS, so undefined)
      const assignment_due_at = undefined;
      // Choose due date time in order of preference
      const dueDateTime =
        assignment_due_at ||
        (end_at ? end_at.toISOString() : null) ||
        (start_at ? start_at.toISOString() : null);
      // If no dueDateTime fallback to start_at
      const useDate = dueDateTime
        ? new Date(dueDateTime)
        : (start_at || new Date());
      const dateKey = useDate.toISOString().split('T')[0];

      parsedEvents[dateKey] = {
        ...parsedEvents[dateKey],
        assignments: [
          ...(parsedEvents[dateKey]?.assignments || []),
          {
            title: event.summary,
            description: event.description || 'Assignment due',
            time: useDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'assignment',
            courseName: event.component.getFirstPropertyValue('LOCATION') || 'Course'
          }
        ]
      };

      // Generate study block for the day before using the same dueDateTime
      const studyDate = new Date(useDate);
      studyDate.setDate(studyDate.getDate() - 1);
      const studyDateKey = studyDate.toISOString().split('T')[0];

      generatedStudyBlocks[studyDateKey] = {
        ...generatedStudyBlocks[studyDateKey],
        studyBlocks: [
          ...(generatedStudyBlocks[studyDateKey]?.studyBlocks || []),
          {
            title: `Study for ${event.summary}`,
            time: '19:00',
            duration: '1 hour',
            type: 'study',
            courseName: event.component.getFirstPropertyValue('LOCATION') || 'Course'
          }
        ]
      };
    });

    setEvents(parsedEvents);
    setStudyBlocks(generatedStudyBlocks);
  };

  // Google Calendar Functions
  const handleGoogleSignIn = async () => {
    console.log('🔵 Google login button clicked');
    
    if (!googleApiInitialized) {
      const error = 'Google API not initialized. Please refresh the page and check console for setup instructions.';
      console.error('❌', error);
      Alert.alert('Setup Required', error);
      return;
    }

    setIsGoogleLoading(true);
    try {
      if (isGoogleSignedIn) {
        // If already signed in, just refresh events
        console.log('Already signed in, refreshing events...');
        await fetchGoogleCalendarEventsData();
        Alert.alert('Success', 'Google Calendar events refreshed!');
      } else {
        // Sign in and fetch events
        console.log('Attempting Google sign-in...');
        await signInToGoogle();
        setIsGoogleSignedIn(true);
        console.log('Sign-in successful, fetching events...');
        await fetchGoogleCalendarEventsData();
        Alert.alert('Success', 'Connected to Google Calendar!');
      }
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      
      // Provide specific error messages
      let errorMessage = 'Failed to connect to Google Calendar';
      if (error.error === 'idpiframe_initialization_failed') {
        errorMessage = 'Google sign-in failed: Please check your internet connection and try again.';
      } else if (error.error === 'invalid_client') {
        errorMessage = 'Google Client ID is invalid. Please check your Google Cloud Console configuration.';
      } else if (error.message?.includes('Client ID not configured')) {
        errorMessage = 'Google Client ID not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file.';
      } else if (error.message?.includes('Google API script not loaded')) {
        errorMessage = 'Google API script not loaded. Please check your app.json configuration.';
      } else {
        errorMessage = `Failed to connect to Google Calendar: ${error.message || error.error || 'Unknown error'}`;
      }
      
      Alert.alert('Google Calendar Error', errorMessage);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutOfGoogle();
      setIsGoogleSignedIn(false);
      setGoogleEvents({});
      Alert.alert('Success', 'Disconnected from Google Calendar');
    } catch (error) {
      console.error('Google sign-out error:', error);
      Alert.alert('Error', `Failed to disconnect: ${error.message}`);
    }
  };

  const fetchGoogleCalendarEventsData = async () => {
    if (!isGoogleSignedIn) {
      console.log('Not signed in to Google, skipping calendar fetch');
      return;
    }

    try {
      console.log('Fetching Google Calendar events...');
      
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // Next 90 days
      
      const googleEventsList = await fetchGoogleCalendarEvents(timeMin, timeMax);
      console.log('Google Calendar events received:', googleEventsList.length);
      
      const parsedGoogleEvents = {};
      
      googleEventsList.forEach(event => {
        // Parse start time - handle both date and dateTime
        const startTime = event.start?.dateTime || event.start?.date;
        if (!startTime) return;
        
        const eventDate = new Date(startTime);
        const dateKey = eventDate.toISOString().split('T')[0];
        
        // Parse end time
        const endTime = event.end?.dateTime || event.end?.date;
        const endDate = endTime ? new Date(endTime) : eventDate;
        
        // Add Google event to parsed events
        parsedGoogleEvents[dateKey] = {
          ...parsedGoogleEvents[dateKey],
          googleEvents: [
            ...(parsedGoogleEvents[dateKey]?.googleEvents || []),
            {
              title: event.summary || 'Google Event',
              description: event.description || '',
              time: eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              endTime: endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'google',
              location: event.location || '',
              htmlLink: event.htmlLink || '',
              id: event.id
            }
          ]
        };
      });

      console.log('Parsed Google events:', Object.keys(parsedGoogleEvents).length);
      setGoogleEvents(parsedGoogleEvents);
      
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      Alert.alert('Error', `Failed to load Google Calendar events: ${error.message}`);
    }
  };

  const getMarkedDates = () => {
    const marked = {};
    
    // Mark dates with assignments
    Object.keys(events).forEach(date => {
      marked[date] = {
        marked: true,
        dotColor: '#ff6b6b',
        customStyles: {
          container: {
            backgroundColor: '#ffebee',
            borderRadius: 8,
          },
          text: {
            color: '#d32f2f',
            fontWeight: 'bold',
          },
        },
      };
    });

    // Mark dates with study blocks
    Object.keys(studyBlocks).forEach(date => {
      if (marked[date]) {
        marked[date].dots = [
          { key: 'assignment', color: '#ff6b6b' },
          { key: 'study', color: '#4caf50' }
        ];
        marked[date].customStyles.container.backgroundColor = '#e8f5e8';
      } else {
        marked[date] = {
          marked: true,
          dotColor: '#4caf50',
          customStyles: {
            container: {
              backgroundColor: '#e8f5e8',
              borderRadius: 8,
            },
            text: {
              color: '#2e7d32',
              fontWeight: 'bold',
            },
          },
        };
      }
    });

    // Mark dates with Google Calendar events
    Object.keys(googleEvents).forEach(date => {
      if (marked[date]) {
        // Add Google Calendar dot to existing dots
        if (marked[date].dots) {
          marked[date].dots.push({ key: 'google', color: '#2196f3' });
        } else {
          marked[date].dots = [
            { key: 'assignment', color: '#ff6b6b' },
            { key: 'google', color: '#2196f3' }
          ];
        }
        marked[date].customStyles.container.backgroundColor = '#e3f2fd';
      } else {
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

    return marked;
  };

  const getEventsForSelectedDate = () => {
    const dateEvents = events[selectedDate]?.assignments || [];
    const dateStudyBlocks = studyBlocks[selectedDate]?.studyBlocks || [];
    const dateGoogleEvents = googleEvents[selectedDate]?.googleEvents || [];
    return [...dateEvents, ...dateStudyBlocks, ...dateGoogleEvents];
  };

  const addNewAssignment = () => {
    if (!newAssignment.title || !newAssignment.dueDate) {
      Alert.alert('Error', 'Please fill in assignment title and due date');
      return;
    }

    const dueDate = newAssignment.dueDate;
    const assignment = {
      title: newAssignment.title,
      description: newAssignment.description,
      time: newAssignment.time,
      type: 'assignment'
    };

    // Add assignment to events
    setEvents(prevEvents => ({
      ...prevEvents,
      [dueDate]: {
        ...prevEvents[dueDate],
        assignments: [
          ...(prevEvents[dueDate]?.assignments || []),
          assignment
        ]
      }
    }));

    // Generate study block for the day before
    const studyDate = new Date(dueDate);
    studyDate.setDate(studyDate.getDate() - 1);
    const studyDateKey = studyDate.toISOString().split('T')[0];
    
    setStudyBlocks(prevBlocks => ({
      ...prevBlocks,
      [studyDateKey]: {
        ...prevBlocks[studyDateKey],
        studyBlocks: [
          ...(prevBlocks[studyDateKey]?.studyBlocks || []),
          {
            title: `Study for ${newAssignment.title}`,
            time: '19:00',
            duration: '1 hour',
            type: 'study'
          }
        ]
      }
    }));

    // Reset form and close modal
    setNewAssignment({
      title: '',
      description: '',
      dueDate: '',
      time: '23:59'
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
          onPress={fetchCalendarEvents}
        >
          <Text style={styles.addButtonText}>🔄 Refresh Canvas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Assignment</Text>
        </TouchableOpacity>
        
        {!isGoogleSignedIn ? (
          <TouchableOpacity 
            style={[styles.addButton, styles.googleButton]}
            onPress={handleGoogleSignIn}
            disabled={!googleApiInitialized || isGoogleLoading}
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
            <Text style={styles.addButtonText}>📅 Disconnect Google</Text>
          </TouchableOpacity>
        )}
      </View>
      
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
          dotColor: '#00adf5',
          selectedDotColor: '#ffffff',
          arrowColor: '#2196f3',
          disabledArrowColor: '#d9e1e8',
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
              key={index} 
              style={[
                styles.eventItem,
                event.type === 'assignment' ? styles.assignmentEvent : 
                event.type === 'study' ? styles.studyEvent : 
                styles.googleEvent
              ]}
            >
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventTime}>
                {event.time}
                {event.endTime && event.type === 'google' && ` - ${event.endTime}`}
              </Text>
              {event.description && (
                <Text style={styles.eventDescription}>{event.description}</Text>
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
                   'Google Event'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

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
              placeholder="Description (optional)"
              value={newAssignment.description}
              onChangeText={(text) => setNewAssignment({...newAssignment, description: text})}
              multiline
            />
            
            <TextInput
              style={styles.input}
              placeholder="Due Date (YYYY-MM-DD)"
              value={newAssignment.dueDate}
              onChangeText={(text) => setNewAssignment({...newAssignment, dueDate: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Time (HH:MM)"
              value={newAssignment.time}
              onChangeText={(text) => setNewAssignment({...newAssignment, time: text})}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.addButton]}
                onPress={addNewAssignment}
              >
                <Text style={styles.addButtonText}>Add Assignment</Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  calendar: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  noEvents: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
  eventItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  assignmentEvent: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  studyEvent: {
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  googleEvent: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
  eventDuration: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  eventLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  eventTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  assignmentBadge: {
    backgroundColor: '#ffebee',
  },
  studyBadge: {
    backgroundColor: '#e8f5e8',
  },
  googleBadge: {
    backgroundColor: '#e3f2fd',
  },
  eventTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  refreshButton: {
    backgroundColor: '#4caf50',
  },
  googleButton: {
    backgroundColor: '#2196f3',
  },
  googleSignedInButton: {
    backgroundColor: '#4caf50',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
});