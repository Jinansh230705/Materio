// Docs on event and context https://docs.netlify.com/functions/build/#code-your-function-2
export default async (event, context) => {
  console.log('Invites test function called');
  console.log('Event method:', event.httpMethod);
  console.log('Event path:', event.path);
  console.log('Event headers:', JSON.stringify(event.headers));
  
  if (event.body) {
    try {
      const body = JSON.parse(event.body);
      console.log('Event body:', JSON.stringify(body));
    } catch (e) {
      console.log('Error parsing body:', e);
      console.log('Raw body:', event.body);
    }
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({ 
      message: 'Invites test function',
      method: event.httpMethod,
      path: event.path,
      body: event.body ? JSON.parse(event.body) : null,
      headers: event.headers
    })
  };
};
