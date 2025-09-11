// Date utility functions for the Study Calendar app
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const getDateKey = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const subtractDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

export const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  return today.toDateString() === checkDate.toDateString();
};

export const isTomorrow = (date) => {
  const tomorrow = addDays(new Date(), 1);
  const checkDate = new Date(date);
  return tomorrow.toDateString() === checkDate.toDateString();
};

export const isYesterday = (date) => {
  const yesterday = subtractDays(new Date(), 1);
  const checkDate = new Date(date);
  return yesterday.toDateString() === checkDate.toDateString();
};

export const getRelativeDate = (date) => {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return formatDate(date);
};
