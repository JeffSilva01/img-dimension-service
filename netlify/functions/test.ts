import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: 'Test endpoint working',
      method: event.httpMethod,
      headers: event.headers,
      bodyLength: event.body ? event.body.length : 0,
      isBase64: event.isBase64Encoded
    }),
  };
};