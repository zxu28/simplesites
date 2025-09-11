import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../constants/colors';
import EventCard from './EventCard';

const EventsList = ({ events = [], studyBlocks = [], selectedDate }) => {
  const allEvents = [...events, ...studyBlocks];
  
  // Sort events by time
  const sortedEvents = allEvents.sort((a, b) => {
    const timeA = a.time || '00:00';
    const timeB = b.time || '00:00';
    return timeA.localeCompare(timeB);
  });

  const formatSelectedDate = (date) => {
    if (!date) return '';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (sortedEvents.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          Events for {formatSelectedDate(selectedDate)}
        </Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No events scheduled for this date</Text>
          <Text style={styles.emptySubtext}>
            Tap on a date with events to see them here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Events for {formatSelectedDate(selectedDate)}
      </Text>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {sortedEvents.map((event, index) => (
          <EventCard
            key={`${event.id || index}_${event.type}`}
            event={event}
            type={event.type}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default EventsList;
