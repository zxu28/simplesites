// Canvas LMS Configuration
export const CANVAS_CONFIG = {
  // Replace with your Canvas domain (e.g., 'your-school.instructure.com')
  domain: 'canvas.instructure.com',
  apiToken: '22006~yavuV4VuzeZcQGrtt2hEwLfnTn2Wm3HJeTfPyKWr49a3MnCPfQF84xPun9E9UCfR',
  baseUrl: 'https://canvas.instructure.com/api/v1',
  
  // API endpoints
  endpoints: {
    calendarEvents: '/calendar_events',
    assignments: '/courses/{course_id}/assignments',
    courses: '/courses',
    user: '/users/self'
  }
};

// Helper function to build Canvas API URLs
export const buildCanvasUrl = (endpoint, params = {}) => {
  const baseUrl = CANVAS_CONFIG.baseUrl;
  let url = `${baseUrl}${endpoint}`;
  
  // Replace path parameters
  Object.keys(params).forEach(key => {
    if (url.includes(`{${key}}`)) {
      url = url.replace(`{${key}}`, params[key]);
    }
  });
  
  // Add query parameters
  const queryParams = new URLSearchParams({
    access_token: CANVAS_CONFIG.apiToken,
    per_page: '100',
    ...params
  });
  
  return `${url}?${queryParams.toString()}`;
};
