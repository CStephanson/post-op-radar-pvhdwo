import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerVitalsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/patients/:patientId/vitals - Add vital signs
  app.fastify.post<{
    Params: { patientId: string };
    Body: {
      heartRate?: number;
      systolicBP?: number;
      diastolicBP?: number;
      temperature?: string;
      urineOutput?: string;
      timestamp: string;
    };
    Reply: typeof schema.vitalSigns.$inferSelect;
  }>(
    '/api/patients/:patientId/vitals',
    {
      schema: {
        description: 'Add vital signs for a patient',
        tags: ['vitals'],
        params: {
          type: 'object',
          required: ['patientId'],
          properties: { patientId: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['timestamp'],
          properties: {
            heartRate: { type: 'integer' },
            systolicBP: { type: 'integer' },
            diastolicBP: { type: 'integer' },
            temperature: { type: 'string' },
            urineOutput: { type: 'string' },
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
        'Adding vital signs'
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
      const heartRate = body.heartRate as number | undefined;
      const systolicBP = body.systolicBP as number | undefined;
      const diastolicBP = body.diastolicBP as number | undefined;
      const temperature = body.temperature as string | undefined;
      const urineOutput = body.urineOutput as string | undefined;
      const timestamp = body.timestamp as string;

      const vitalValues: typeof schema.vitalSigns.$inferInsert = {
        patientId,
        timestamp: new Date(timestamp),
      };

      if (heartRate !== undefined) vitalValues.heartRate = heartRate;
      if (systolicBP !== undefined) vitalValues.systolicBP = systolicBP;
      if (diastolicBP !== undefined) vitalValues.diastolicBP = diastolicBP;
      if (temperature !== undefined) vitalValues.temperature = temperature;
      if (urineOutput !== undefined) vitalValues.urineOutput = urineOutput;

      const [vital] = await app.db
        .insert(schema.vitalSigns)
        .values(vitalValues)
        .returning();

      app.logger.info(
        { userId: session.user.id, patientId, vitalId: vital.id },
        'Vital signs recorded successfully'
      );

      return vital;
    }
  );

  // GET /api/patients/:patientId/vitals - Get vitals array
  app.fastify.get<{
    Params: { patientId: string };
    Reply: typeof schema.vitalSigns.$inferSelect[];
  }>(
    '/api/patients/:patientId/vitals',
    {
      schema: {
        description: 'Get vital signs for a patient',
        tags: ['vitals'],
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
        'Fetching vital signs'
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

      const vitals = await app.db
        .select()
        .from(schema.vitalSigns)
        .where(eq(schema.vitalSigns.patientId, patientId))
        .orderBy(schema.vitalSigns.timestamp);

      app.logger.info(
        { userId: session.user.id, patientId, count: vitals.length },
        'Vital signs retrieved'
      );

      return vitals;
    }
  );
}
