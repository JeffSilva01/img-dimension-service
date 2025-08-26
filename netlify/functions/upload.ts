import { Handler } from '@netlify/functions';
import multipart from 'parse-multipart-data';
import { processImage } from '../../src/imageService';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const contentType = event.headers['content-type'] || '';
    const body = Buffer.from(event.body || '', 'base64');

    const boundary = contentType.split('boundary=')[1];
    const parts = multipart.parse(body, boundary);

    const filePart = parts.find((part) => part.name === 'file');
    if (!filePart) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No file uploaded' }),
      };
    }

    const dimensions = await processImage(filePart.data);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(dimensions),
    };
  } catch (err) {
    console.error('Upload function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
