// Study block generation utility
import { subtractDays, getDateKey } from './dateHelpers';

export const generateStudyBlocks = (assignments, options = {}) => {
  const {
    studyTime = '19:00', // Default study time
    duration = '1 hour', // Default duration
    daysBefore = 1, // Days before assignment to schedule study
  } = options;

  const studyBlocks = {};

  assignments.forEach(assignment => {
    // Calculate study date (day before assignment)
    const studyDate = subtractDays(assignment.startDate, daysBefore);
    const studyDateKey = getDateKey(studyDate);

    // Create study block
    const studyBlock = {
      id: `study_${assignment.id}`,
      title: `Study for ${assignment.title}`,
      description: `Prepare for: ${assignment.title}`,
      time: studyTime,
      duration: duration,
      type: 'study',
      relatedAssignment: assignment.id,
      studyDate: studyDate,
    };

    // Add to study blocks
    if (!studyBlocks[studyDateKey]) {
      studyBlocks[studyDateKey] = [];
    }
    studyBlocks[studyDateKey].push(studyBlock);
  });

  return studyBlocks;
};

export const scheduleStudyBlocks = (assignments, studyPreferences = {}) => {
  const {
    preferredTimes = ['19:00', '20:00', '21:00'], // Multiple time slots
    duration = '1 hour',
    daysBefore = 1,
    maxStudyBlocksPerDay = 3,
  } = studyPreferences;

  const studyBlocks = {};
  const dailyCounts = {};

  assignments.forEach((assignment, index) => {
    const studyDate = subtractDays(assignment.startDate, daysBefore);
    const studyDateKey = getDateKey(studyDate);

    // Initialize daily count
    if (!dailyCounts[studyDateKey]) {
      dailyCounts[studyDateKey] = 0;
    }

    // Skip if too many study blocks on this day
    if (dailyCounts[studyDateKey] >= maxStudyBlocksPerDay) {
      return;
    }

    // Select time slot based on daily count
    const timeIndex = dailyCounts[studyDateKey] % preferredTimes.length;
    const selectedTime = preferredTimes[timeIndex];

    const studyBlock = {
      id: `study_${assignment.id}`,
      title: `Study for ${assignment.title}`,
      description: `Prepare for: ${assignment.title}`,
      time: selectedTime,
      duration: duration,
      type: 'study',
      relatedAssignment: assignment.id,
      studyDate: studyDate,
    };

    if (!studyBlocks[studyDateKey]) {
      studyBlocks[studyDateKey] = [];
    }
    studyBlocks[studyDateKey].push(studyBlock);
    dailyCounts[studyDateKey]++;
  });

  return studyBlocks;
};

export const optimizeStudySchedule = (assignments, constraints = {}) => {
  const {
    maxStudyHoursPerDay = 3,
    preferredStudyTimes = ['19:00', '20:00', '21:00'],
    bufferDays = 1,
  } = constraints;

  // Sort assignments by due date
  const sortedAssignments = [...assignments].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate)
  );

  const studyBlocks = {};
  const dailyStudyHours = {};

  sortedAssignments.forEach(assignment => {
    const studyDate = subtractDays(assignment.startDate, bufferDays);
    const studyDateKey = getDateKey(studyDate);

    // Initialize daily hours
    if (!dailyStudyHours[studyDateKey]) {
      dailyStudyHours[studyDateKey] = 0;
    }

    // Skip if daily limit reached
    if (dailyStudyHours[studyDateKey] >= maxStudyHoursPerDay) {
      return;
    }

    // Find available time slot
    const availableTimeIndex = Math.floor(dailyStudyHours[studyDateKey]);
    const selectedTime = preferredStudyTimes[availableTimeIndex] || preferredStudyTimes[0];

    const studyBlock = {
      id: `study_${assignment.id}`,
      title: `Study for ${assignment.title}`,
      description: `Prepare for: ${assignment.title}`,
      time: selectedTime,
      duration: '1 hour',
      type: 'study',
      relatedAssignment: assignment.id,
      studyDate: studyDate,
    };

    if (!studyBlocks[studyDateKey]) {
      studyBlocks[studyDateKey] = [];
    }
    studyBlocks[studyDateKey].push(studyBlock);
    dailyStudyHours[studyDateKey] += 1;
  });

  return studyBlocks;
};
