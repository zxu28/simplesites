import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

const EventCard = ({ event, type = 'assignment' }) => {
  const isAssignment = type === 'assignment';
  const cardStyle = isAssignment ? styles.assignmentCard : styles.studyCard;
  const badgeStyle = isAssignment ? styles.assignmentBadge : styles.studyBadge;
  const badgeTextStyle = isAssignment ? styles.assignmentBadgeText : styles.studyBadgeText;

  return (
    <View style={[styles.eventCard, cardStyle]}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <View style={badgeStyle}>
          <Text style={badgeTextStyle}>
            {isAssignment ? 'Assignment' : 'Study Block'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.eventTime}>{event.time}</Text>
      
      {event.description && (
        <Text style={styles.eventDescription}>{event.description}</Text>
      )}
      
      {event.duration && (
        <Text style={styles.eventDuration}>Duration: {event.duration}</Text>
      )}
      
      {event.location && (
        <Text style={styles.eventLocation}>📍 {event.location}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  assignmentCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.assignment,
  },
  studyCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.study,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  assignmentBadge: {
    backgroundColor: COLORS.assignmentBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  studyBadge: {
    backgroundColor: COLORS.studyBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  assignmentBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.assignmentText,
  },
  studyBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.studyText,
  },
  eventTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  eventDescription: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 8,
    lineHeight: 20,
  },
  eventDuration: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});

export default EventCard;
