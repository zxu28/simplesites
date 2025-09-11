import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { COLORS, THEME } from '../constants/colors';

const CalendarView = ({ 
  selectedDate, 
  onDateSelect, 
  markedDates, 
  events = {}, 
  studyBlocks = {} 
}) => {
  const getMarkedDates = () => {
    const marked = { ...markedDates };
    
    // Mark dates with assignments
    Object.keys(events).forEach(date => {
      marked[date] = {
        ...marked[date],
        marked: true,
        dotColor: COLORS.assignment,
        customStyles: {
          container: {
            backgroundColor: COLORS.assignmentBackground,
            borderRadius: 8,
          },
          text: {
            color: COLORS.assignmentText,
            fontWeight: 'bold',
          },
        },
      };
    });

    // Mark dates with study blocks
    Object.keys(studyBlocks).forEach(date => {
      if (marked[date]) {
        marked[date].dots = [
          { key: 'assignment', color: COLORS.assignment },
          { key: 'study', color: COLORS.study }
        ];
        marked[date].customStyles.container.backgroundColor = COLORS.studyBackground;
      } else {
        marked[date] = {
          ...marked[date],
          marked: true,
          dotColor: COLORS.study,
          customStyles: {
            container: {
              backgroundColor: COLORS.studyBackground,
              borderRadius: 8,
            },
            text: {
              color: COLORS.studyText,
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
        selectedColor: COLORS.selectedDay,
        selectedTextColor: '#ffffff',
      };
    }

    return marked;
  };

  return (
    <View style={styles.container}>
      <Calendar
        style={styles.calendar}
        current={selectedDate}
        onDayPress={onDateSelect}
        markedDates={getMarkedDates()}
        theme={THEME.calendar}
        monthFormat={'MMMM yyyy'}
        hideExtraDays={true}
        firstDay={1} // Monday
        showWeekNumbers={false}
        onMonthChange={(month) => {
          console.log('month changed', month);
        }}
        enableSwipeMonths={true}
      />
      
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.assignment }]} />
          <Text style={styles.legendText}>Assignments</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.study }]} />
          <Text style={styles.legendText}>Study Blocks</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendar: {
    borderRadius: 10,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});

export default CalendarView;
