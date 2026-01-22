import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerLabsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/patients/:patientId/labs - Add lab values
  app.fastify.post<{
    Params: { patientId: string };
    Body: {
      wbc?: string;
      hemoglobin?: string;
      creatinine?: string;
      lactate?: string;
      timestamp: string;
    };
    Reply: typeof schema.labValues.$inferSelect;
  }>(
    '/api/patients/:patientId/labs',
    {
      schema: {
        description: 'Add lab values for a patient',
        tags: ['labs'],
        params: {
          type: 'object',
          required: ['patientId'],
          properties: { patientId: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['timestamp'],
          properties: {
            wbc: { type: 'string' },
            hemoglobin: { type: 'string' },
            creatinine: { type: 'string' },
            lactate: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object' },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { patientId } = request.params as { patientId: string };

      app.logger.info(
        { userId: session.user.id, patientId, body: request.body },
        'Adding lab values'
      );

      // Verify patient ownership
      const patient = await app.db.query.patients.findFirst({
        where: and(
          eq(schema.patients.id, patientId),
          eq(schema.patients.userId, session.user.id)
        ),
      });

      if (!patient) {
        app.logger.warn(
          { userId: session.user.id, patientId },
          'Patient not found or not owned by user'
        );
        return reply.status(404).send({ error: 'Patient not found' });
      }

      const body = request.body as Record<string, unknown>;
      const wbc = body.wbc as string | undefined;
      const hemoglobin = body.hemoglobin as string | undefined;
      const creatinine = body.creatinine as string | undefined;
      const lactate = body.lactate as string | undefined;
      const timestamp = body.timestamp as string;

      const labValues: typeof schema.labValues.$inferInsert = {
        patientId,
        timestamp: new Date(timestamp),
      };

      if (wbc !== undefined) labValues.wbc = wbc;
      if (hemoglobin !== undefined) labValues.hemoglobin = hemoglobin;
      if (creatinine !== undefined) labValues.creatinine = creatinine;
      if (lactate !== undefined) labValues.lactate = lactate;

      const [lab] = await app.db
        .insert(schema.labValues)
        .values(labValues)
        .returning();

      app.logger.info(
        { userId: session.user.id, patientId, labId: lab.id },
        'Lab values recorded successfully'
      );

      return lab;
    }
  );

  // GET /api/patients/:patientId/labs - Get labs array
  app.fastify.get<{
    Params: { patientId: string };
    Reply: typeof schema.labValues.$inferSelect[];
  }>(
    '/api/patients/:patientId/labs',
    {
      schema: {
        description: 'Get lab values for a patient',
        tags: ['labs'],
        params: {
          type: 'object',
          required: ['patientId'],
          properties: { patientId: { type: 'string' } },
        },
        response: {
          200: {
            type: 'array',
            items: { type: 'object' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { patientId } = request.params as { patientId: string };

      app.logger.info(
        { userId: session.user.id, patientId },
        'Fetching lab values'
      );

      // Verify patient ownership
      const patient = await app.db.query.patients.findFirst({
        where: and(
          eq(schema.patients.id, patientId),
          eq(schema.patients.userId, session.user.id)
        ),
      });

      if (!patient) {
        app.logger.warn(
          { userId: session.user.id, patientId },
          'Patient not found or not owned by user'
        );
        return reply.status(404).send({ error: 'Patient not found' });
      }

      const labs = await app.db
        .select()
        .from(schema.labValues)
        .where(eq(schema.labValues.patientId, patientId))
        .orderBy(schema.labValues.timestamp);

      app.logger.info(
        { userId: session.user.id, patientId, count: labs.length },
        'Lab values retrieved'
      );

      return labs;
    }
  );
}
