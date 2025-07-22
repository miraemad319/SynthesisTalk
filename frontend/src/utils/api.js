// Base URL of the FastAPI backend
const BASE_URL = 'http://127.0.0.1:8000';

/*
Generate helper functions to call the backend API endpoints:
- Each function should send a POST request to one of these routes: /chat, /summary, /search, /export, /upload, etc.
- Use fetch with method 'POST', 'Content-Type: application/json', and include a JSON body like { text: string }, { message: string }, or { query: string } depending on what the backend expects.
- Return the parsed JSON response or throw an error if the request fails.
- Export each function so it can be imported and used in frontend components.
*/

// Example:
// export async function postSummary(text) {
//   const response = await fetch(`${BASE_URL}/summary`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ text }),
//   });
//   if (!response.ok) throw new Error('Failed to summarize');
//   return response.json();
// }
