import { Handler } from '@netlify/functions';
import sharp from 'sharp';
import ExifReader from 'exifreader';

interface ImageDimensions {
  width_mm: number;
  height_mm: number;
  dpi_x: number;
  dpi_y: number;
}

interface ImageMetadata {
  width: number;
  height: number;
  dpi_x?: number;
  dpi_y?: number;
}

const DEFAULT_DPI = 72;

async function processImage(buffer: Buffer): Promise<ImageDimensions> {
  const metadata = await getImageMetadata(buffer);
  return calculatePhysicalDimensions(metadata);
}

async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  const sharpMetadata = await sharp(buffer).metadata();
  
  let dpi_x = DEFAULT_DPI;
  let dpi_y = DEFAULT_DPI;

  try {
    const exifTags = ExifReader.load(buffer);
    
    if (exifTags['XResolution'] && exifTags['YResolution']) {
      const xRes = exifTags['XResolution'];
      const yRes = exifTags['YResolution'];
      
      if (xRes.value && yRes.value) {
        if (Array.isArray(xRes.value) && xRes.value.length >= 2) {
          dpi_x = Number(xRes.value[0]) / Number(xRes.value[1]);
        } else if (typeof xRes.value === 'number') {
          dpi_x = xRes.value;
        }
        
        if (Array.isArray(yRes.value) && yRes.value.length >= 2) {
          dpi_y = Number(yRes.value[0]) / Number(yRes.value[1]);
        } else if (typeof yRes.value === 'number') {
          dpi_y = yRes.value;
        }
      }
    }
  } catch (error) {
    console.warn('Could not read EXIF data, using default DPI:', error);
  }

  return {
    width: sharpMetadata.width || 0,
    height: sharpMetadata.height || 0,
    dpi_x,
    dpi_y,
  };
}

function calculatePhysicalDimensions(metadata: ImageMetadata): ImageDimensions {
  const dpi_x = metadata.dpi_x || DEFAULT_DPI;
  const dpi_y = metadata.dpi_y || DEFAULT_DPI;

  const width_mm = (metadata.width / dpi_x) * 25.4;
  const height_mm = (metadata.height / dpi_y) * 25.4;

  return {
    width_mm: Math.round(width_mm * 100) / 100,
    height_mm: Math.round(height_mm * 100) / 100,
    dpi_x,
    dpi_y,
  };
}

function parseMultipart(body: Buffer, boundary: string): { name: string; data: Buffer }[] {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts: { name: string; data: Buffer }[] = [];
  
  let startIndex = 0;
  while (true) {
    const boundaryIndex = body.indexOf(boundaryBuffer, startIndex);
    if (boundaryIndex === -1) break;
    
    const nextBoundaryIndex = body.indexOf(boundaryBuffer, boundaryIndex + boundaryBuffer.length);
    if (nextBoundaryIndex === -1) break;
    
    const partData = body.slice(boundaryIndex + boundaryBuffer.length, nextBoundaryIndex);
    
    // Find the double CRLF that separates headers from body
    const headerEnd = partData.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      startIndex = nextBoundaryIndex;
      continue;
    }
    
    const headers = partData.slice(0, headerEnd).toString();
    const nameMatch = headers.match(/name="([^"]+)"/);
    
    if (nameMatch) {
      const fileData = partData.slice(headerEnd + 4);
      // Remove trailing CRLF
      const cleanData = fileData.slice(0, -2);
      parts.push({
        name: nameMatch[1],
        data: cleanData
      });
    }
    
    startIndex = nextBoundaryIndex;
  }
  
  return parts;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    console.log('Content-Type:', contentType);
    console.log('Body length:', event.body?.length || 0);
    console.log('isBase64Encoded:', event.isBase64Encoded);
    
    if (!contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'No body provided' }),
      };
    }

    const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    console.log('Parsed body length:', body.length);

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing boundary in Content-Type' }),
      };
    }

    console.log('Boundary:', boundary);

    const parts = parseMultipart(body, boundary);
    console.log('Parts found:', parts.length);

    const filePart = parts.find((part) => part.name === 'file');
    if (!filePart) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'No file uploaded' }),
      };
    }

    console.log('File size:', filePart.data.length);

    if (filePart.data.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Empty file' }),
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
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error'
      }),
    };
  }
};
