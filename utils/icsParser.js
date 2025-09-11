// ICS feed parsing utility for Canvas LMS integration
import ICAL from 'ical.js';

export const parseICSFeed = (icsContent) => {
  try {
    const jcalData = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');
    
    const events = [];
    
    vevents.forEach(vevent => {
      const event = new ICAL.Event(vevent);
      const startDate = event.startDate.toJSDate();
      const endDate = event.endDate.toJSDate();
      
      events.push({
        id: event.uid || Math.random().toString(36).substr(2, 9),
        title: event.summary || 'Untitled Event',
        description: event.description || '',
        startDate: startDate,
        endDate: endDate,
        location: event.location || '',
        url: event.url || '',
        type: 'assignment', // Default type
      });
    });
    
    return events;
  } catch (error) {
    console.error('Error parsing ICS feed:', error);
    throw new Error('Failed to parse ICS feed');
  }
};

export const fetchICSFromURL = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const icsContent = await response.text();
    return parseICSFeed(icsContent);
  } catch (error) {
    console.error('Error fetching ICS feed:', error);
    throw new Error('Failed to fetch ICS feed from URL');
  }
};

export const getSampleICSContent = () => {
  return `BEGIN:VCALENDAR
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
BEGIN:VEVENT
DTSTART:20241222T235900Z
DTEND:20241223T000000Z
SUMMARY:English Literature Paper Due
DESCRIPTION:Analyze themes in Shakespeare's Hamlet
LOCATION:Online
END:VEVENT
BEGIN:VEVENT
DTSTART:20241225T235900Z
DTEND:20241226T000000Z
SUMMARY:Final Project Presentation
DESCRIPTION:Present your semester-long research project
LOCATION:Classroom A101
END:VEVENT
END:VCALENDAR`;
};
