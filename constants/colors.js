// Color constants for the Study Calendar app
export const COLORS = {
  // Primary colors
  primary: '#2196f3',
  primaryDark: '#1976d2',
  primaryLight: '#bbdefb',
  
  // Assignment colors
  assignment: '#ff6b6b',
  assignmentBackground: '#ffebee',
  assignmentText: '#d32f2f',
  
  // Study block colors
  study: '#4caf50',
  studyBackground: '#e8f5e8',
  studyText: '#2e7d32',
  
  // Calendar colors
  calendarBackground: '#ffffff',
  selectedDay: '#2196f3',
  today: '#2196f3',
  
  // Text colors
  textPrimary: '#333333',
  textSecondary: '#666666',
  textDisabled: '#d9e1e8',
  
  // Background colors
  background: '#f5f5f5',
  cardBackground: '#ffffff',
  
  // Status colors
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',
};

export const THEME = {
  calendar: {
    backgroundColor: COLORS.calendarBackground,
    calendarBackground: COLORS.calendarBackground,
    textSectionTitleColor: '#b6c1cd',
    selectedDayBackgroundColor: COLORS.selectedDay,
    selectedDayTextColor: '#ffffff',
    todayTextColor: COLORS.today,
    dayTextColor: '#2d4150',
    textDisabledColor: COLORS.textDisabled,
    dotColor: COLORS.primary,
    selectedDotColor: '#ffffff',
    arrowColor: COLORS.primary,
    disabledArrowColor: COLORS.textDisabled,
    monthTextColor: COLORS.primary,
    indicatorColor: COLORS.primary,
    textDayFontWeight: '300',
    textMonthFontWeight: 'bold',
    textDayHeaderFontWeight: '300',
    textDayFontSize: 16,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 13,
  },
};
