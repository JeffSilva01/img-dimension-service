import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { processImage } from './imageService';

const fastify = Fastify({
  logger: true,
});

fastify.register(multipart);

fastify.post('/upload', async (request, reply) => {
  try {
    const data = await request.file();
    
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    
    if (buffer.length === 0) {
      return reply.status(400).send({ error: 'Empty file' });
    }

    const mimeType = data.mimetype;
    if (!mimeType.startsWith('image/')) {
      return reply.status(400).send({ error: 'File must be an image' });
    }

    const dimensions = await processImage(buffer);
    
    return reply.send(dimensions);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

fastify.get('/health', async (request, reply) => {
  return reply.send({ status: 'ok' });
});

const start = async (): Promise<void> => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info(`Server listening on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();