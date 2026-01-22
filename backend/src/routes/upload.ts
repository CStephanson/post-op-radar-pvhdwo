import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

export function registerUploadRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/upload/profile-picture - Upload profile picture
  app.fastify.post<{
    Reply: { url: string; key: string };
  }>(
    '/api/upload/profile-picture',
    {
      schema: {
        description: 'Upload a profile picture',
        tags: ['upload'],
        response: {
          200: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              key: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Uploading profile picture');

      // File size limit: 5MB
      const options = { limits: { fileSize: 5 * 1024 * 1024 } };
      const data = await request.file(options);

      if (!data) {
        app.logger.warn({ userId: session.user.id }, 'No file provided for upload');
        return reply.status(400).send({ error: 'No file provided' });
      }

      let buffer: Buffer;
      try {
        buffer = await data.toBuffer();
      } catch (err) {
        app.logger.error(
          { err, userId: session.user.id, filename: data.filename },
          'File too large'
        );
        return reply.status(413).send({ error: 'File too large' });
      }

      // Validate file type
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validMimeTypes.includes(data.mimetype)) {
        app.logger.warn(
          { userId: session.user.id, mimetype: data.mimetype },
          'Invalid file type'
        );
        return reply.status(400).send({ error: 'Invalid file type. Only images allowed.' });
      }

      const key = `profile-pictures/${session.user.id}/${Date.now()}-${data.filename}`;

      try {
        const uploadedKey = await app.storage.upload(key, buffer);
        const { url } = await app.storage.getSignedUrl(uploadedKey);

        app.logger.info(
          { userId: session.user.id, key: uploadedKey },
          'Profile picture uploaded successfully'
        );

        return { url, key: uploadedKey };
      } catch (err) {
        app.logger.error({ err, userId: session.user.id }, 'Failed to upload profile picture');
        throw err;
      }
    }
  );
}
