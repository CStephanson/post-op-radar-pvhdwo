import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerPatientRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/patients - Returns user's patients with vitals and labs
  app.fastify.get<{
    Reply: Array<typeof schema.patients.$inferSelect & {
      vitalSigns: typeof schema.vitalSigns.$inferSelect[];
      labValues: typeof schema.labValues.$inferSelect[];
    }>;
  }>(
    '/api/patients',
    {
      schema: {
        description: 'Get all patients for current user',
        tags: ['patients'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                userId: { type: 'string' },
                name: { type: 'string' },
                idStatement: { type: 'string' },
                procedureType: { type: 'string' },
                postOpDay: { type: 'integer' },
                alertStatus: { type: 'string', enum: ['green', 'yellow', 'red'] },
                preOpDiagnosis: { type: 'string' },
                postOpDiagnosis: { type: 'string' },
                specimensTaken: { type: 'string' },
                estimatedBloodLoss: { type: 'string' },
                complications: { type: 'string' },
                operationDateTime: { type: 'string' },
                surgeon: { type: 'string' },
                anesthesiologist: { type: 'string' },
                anesthesiaType: { type: 'string' },
                clinicalStatus: { type: 'string' },
                hospitalLocation: { type: 'string' },
                notes: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
                vitalSigns: { type: 'array' },
                labValues: { type: 'array' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching patients list');

      const patients = await app.db.query.patients.findMany({
        where: eq(schema.patients.userId, session.user.id),
        with: {
          vitalSigns: true,
          labValues: true,
        },
      });

      app.logger.info(
        { userId: session.user.id, count: patients.length },
        'Patients retrieved'
      );

      return patients;
    }
  );

  // GET /api/patients/:id - Returns single patient with details
  app.fastify.get<{
    Params: { id: string };
    Reply: typeof schema.patients.$inferSelect & {
      vitalSigns: typeof schema.vitalSigns.$inferSelect[];
      labValues: typeof schema.labValues.$inferSelect[];
    } | null;
  }>(
    '/api/patients/:id',
    {
      schema: {
        description: 'Get a single patient',
        tags: ['patients'],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              name: { type: 'string' },
              idStatement: { type: 'string' },
              procedureType: { type: 'string' },
              postOpDay: { type: 'integer' },
              alertStatus: { type: 'string' },
              vitalSigns: { type: 'array' },
              labValues: { type: 'array' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };

      app.logger.info({ userId: session.user.id, patientId: id }, 'Fetching patient');

      const patient = await app.db.query.patients.findFirst({
        where: and(
          eq(schema.patients.id, id),
          eq(schema.patients.userId, session.user.id)
        ),
        with: {
          vitalSigns: true,
          labValues: true,
        },
      });

      if (!patient) {
        app.logger.warn(
          { userId: session.user.id, patientId: id },
          'Patient not found or not owned by user'
        );
        return reply.status(404).send({ error: 'Patient not found' });
      }

      app.logger.info(
        { userId: session.user.id, patientId: id },
        'Patient retrieved'
      );

      return patient;
    }
  );

  // POST /api/patients - Create patient
  app.fastify.post<{
    Body: {
      name: string;
      idStatement?: string;
      procedureType: string;
      postOpDay: number;
      alertStatus?: 'green' | 'orange' | 'red';
      statusMode?: 'auto' | 'manual';
      manualStatus?: 'green' | 'orange' | 'red';
      computedStatus?: 'green' | 'orange' | 'red';
      preOpDiagnosis?: string;
      postOpDiagnosis?: string;
      specimensTaken?: string;
      estimatedBloodLoss?: string;
      complications?: string;
      operationDateTime?: string;
      surgeon?: string;
      anesthesiologist?: string;
      anesthesiaType?: string;
      clinicalStatus?: string;
      hospitalLocation?: string;
      notes?: string;
    };
    Reply: typeof schema.patients.$inferSelect;
  }>(
    '/api/patients',
    {
      schema: {
        description: 'Create a new patient',
        tags: ['patients'],
        body: {
          type: 'object',
          required: ['name', 'procedureType', 'postOpDay'],
          properties: {
            name: { type: 'string' },
            idStatement: { type: 'string' },
            procedureType: { type: 'string' },
            postOpDay: { type: 'integer' },
            alertStatus: { type: 'string', enum: ['green', 'orange', 'red'] },
            statusMode: { type: 'string', enum: ['auto', 'manual'] },
            manualStatus: { type: 'string', enum: ['green', 'orange', 'red'] },
            computedStatus: { type: 'string', enum: ['green', 'orange', 'red'] },
            preOpDiagnosis: { type: 'string' },
            postOpDiagnosis: { type: 'string' },
            specimensTaken: { type: 'string' },
            estimatedBloodLoss: { type: 'string' },
            complications: { type: 'string' },
            operationDateTime: { type: 'string' },
            surgeon: { type: 'string' },
            anesthesiologist: { type: 'string' },
            anesthesiaType: { type: 'string' },
            clinicalStatus: { type: 'string' },
            hospitalLocation: { type: 'string' },
            notes: { type: 'string' },
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

      const body = request.body as Record<string, unknown>;
      const name = body.name as string;
      const idStatement = body.idStatement as string | undefined;
      const procedureType = body.procedureType as string;
      const postOpDay = body.postOpDay as number;
      const statusMode = (body.statusMode as 'auto' | 'manual' | undefined) || 'auto';
      const manualStatus = body.manualStatus as 'green' | 'orange' | 'red' | undefined;
      const computedStatus = body.computedStatus as 'green' | 'orange' | 'red' | undefined;
      const alertStatus = (body.alertStatus as 'green' | 'orange' | 'red' | undefined) || 'green';
      const preOpDiagnosis = body.preOpDiagnosis as string | undefined;
      const postOpDiagnosis = body.postOpDiagnosis as string | undefined;
      const specimensTaken = body.specimensTaken as string | undefined;
      const estimatedBloodLoss = body.estimatedBloodLoss as string | undefined;
      const complications = body.complications as string | undefined;
      const operationDateTime = body.operationDateTime as string | undefined;
      const surgeon = body.surgeon as string | undefined;
      const anesthesiologist = body.anesthesiologist as string | undefined;
      const anesthesiaType = body.anesthesiaType as string | undefined;
      const clinicalStatus = body.clinicalStatus as string | undefined;
      const hospitalLocation = body.hospitalLocation as string | undefined;
      const notes = body.notes as string | undefined;

      app.logger.info(
        { userId: session.user.id, patientName: name },
        'Creating patient'
      );

      try {
        const [patient] = await app.db
          .insert(schema.patients)
          .values({
            userId: session.user.id,
            name,
            idStatement,
            procedureType,
            postOpDay,
            statusMode,
            manualStatus,
            computedStatus,
            alertStatus,
            preOpDiagnosis,
            postOpDiagnosis,
            specimensTaken,
            estimatedBloodLoss,
            complications,
            operationDateTime: operationDateTime ? new Date(operationDateTime) : undefined,
            surgeon,
            anesthesiologist,
            anesthesiaType,
            clinicalStatus,
            hospitalLocation,
            notes,
          })
          .returning();

        app.logger.info(
          { userId: session.user.id, patientId: patient.id },
          'Patient created successfully'
        );

        return patient;
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, patientName: name },
          'Failed to create patient'
        );
        return reply.status(400).send({ error: 'Failed to create patient' });
      }
    }
  );

  // PUT /api/patients/:id - Update patient (ATOMIC: saves all fields provided)
  app.fastify.put<{
    Params: { id: string };
    Body: {
      name?: string;
      idStatement?: string;
      procedureType?: string;
      postOpDay?: number;
      alertStatus?: 'green' | 'orange' | 'red';
      statusMode?: 'auto' | 'manual';
      manualStatus?: 'green' | 'orange' | 'red';
      computedStatus?: 'green' | 'orange' | 'red';
      preOpDiagnosis?: string;
      postOpDiagnosis?: string;
      specimensTaken?: string;
      estimatedBloodLoss?: string;
      complications?: string;
      operationDateTime?: string;
      surgeon?: string;
      anesthesiologist?: string;
      anesthesiaType?: string;
      clinicalStatus?: string;
      hospitalLocation?: string;
      notes?: string;
    };
    Reply: typeof schema.patients.$inferSelect;
  }>(
    '/api/patients/:id',
    {
      schema: {
        description: 'Update a patient - atomically saves all provided fields',
        tags: ['patients'],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            idStatement: { type: 'string' },
            procedureType: { type: 'string' },
            postOpDay: { type: 'integer' },
            alertStatus: { type: 'string', enum: ['green', 'orange', 'red'] },
            statusMode: { type: 'string', enum: ['auto', 'manual'] },
            manualStatus: { type: 'string', enum: ['green', 'orange', 'red'] },
            computedStatus: { type: 'string', enum: ['green', 'orange', 'red'] },
            preOpDiagnosis: { type: 'string' },
            postOpDiagnosis: { type: 'string' },
            specimensTaken: { type: 'string' },
            estimatedBloodLoss: { type: 'string' },
            complications: { type: 'string' },
            operationDateTime: { type: 'string' },
            surgeon: { type: 'string' },
            anesthesiologist: { type: 'string' },
            anesthesiaType: { type: 'string' },
            clinicalStatus: { type: 'string' },
            hospitalLocation: { type: 'string' },
            notes: { type: 'string' },
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

      const { id } = request.params as { id: string };

      const body = request.body as Record<string, unknown>;
      const name = body.name as string | undefined;
      const idStatement = body.idStatement as string | undefined;
      const procedureType = body.procedureType as string | undefined;
      const postOpDay = body.postOpDay as number | undefined;
      const statusMode = body.statusMode as 'auto' | 'manual' | undefined;
      const manualStatus = body.manualStatus as 'green' | 'orange' | 'red' | undefined;
      const computedStatus = body.computedStatus as 'green' | 'orange' | 'red' | undefined;
      const alertStatus = body.alertStatus as 'green' | 'orange' | 'red' | undefined;
      const preOpDiagnosis = body.preOpDiagnosis as string | undefined;
      const postOpDiagnosis = body.postOpDiagnosis as string | undefined;
      const specimensTaken = body.specimensTaken as string | undefined;
      const estimatedBloodLoss = body.estimatedBloodLoss as string | undefined;
      const complications = body.complications as string | undefined;
      const operationDateTime = body.operationDateTime as string | undefined;
      const surgeon = body.surgeon as string | undefined;
      const anesthesiologist = body.anesthesiologist as string | undefined;
      const anesthesiaType = body.anesthesiaType as string | undefined;
      const clinicalStatus = body.clinicalStatus as string | undefined;
      const hospitalLocation = body.hospitalLocation as string | undefined;
      const notes = body.notes as string | undefined;

      app.logger.info(
        { userId: session.user.id, patientId: id, fieldsProvided: Object.keys(body).length },
        'Updating patient (atomic save)'
      );

      // Verify ownership
      const patient = await app.db.query.patients.findFirst({
        where: and(
          eq(schema.patients.id, id),
          eq(schema.patients.userId, session.user.id)
        ),
      });

      if (!patient) {
        app.logger.warn(
          { userId: session.user.id, patientId: id },
          'Patient not found or not owned by user'
        );
        return reply.status(404).send({ error: 'Patient not found' });
      }

      try {
        const updateData = {
          ...(name !== undefined && { name }),
          ...(idStatement !== undefined && { idStatement }),
          ...(procedureType !== undefined && { procedureType }),
          ...(postOpDay !== undefined && { postOpDay }),
          ...(statusMode !== undefined && { statusMode }),
          ...(manualStatus !== undefined && { manualStatus }),
          ...(computedStatus !== undefined && { computedStatus }),
          ...(alertStatus !== undefined && { alertStatus }),
          ...(preOpDiagnosis !== undefined && { preOpDiagnosis }),
          ...(postOpDiagnosis !== undefined && { postOpDiagnosis }),
          ...(specimensTaken !== undefined && { specimensTaken }),
          ...(estimatedBloodLoss !== undefined && { estimatedBloodLoss }),
          ...(complications !== undefined && { complications }),
          ...(operationDateTime !== undefined && {
            operationDateTime: operationDateTime ? new Date(operationDateTime) : null,
          }),
          ...(surgeon !== undefined && { surgeon }),
          ...(anesthesiologist !== undefined && { anesthesiologist }),
          ...(anesthesiaType !== undefined && { anesthesiaType }),
          ...(clinicalStatus !== undefined && { clinicalStatus }),
          ...(hospitalLocation !== undefined && { hospitalLocation }),
          ...(notes !== undefined && { notes }),
        };

        const [updated] = await app.db
          .update(schema.patients)
          .set(updateData)
          .where(eq(schema.patients.id, id))
          .returning();

        app.logger.info(
          { userId: session.user.id, patientId: id, savedFields: Object.keys(updateData).length },
          'Patient updated successfully (atomic)'
        );

        return updated;
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, patientId: id },
          'Failed to update patient - atomic save failed'
        );
        return reply.status(400).send({
          error: 'Failed to save patient - please try again',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // DELETE /api/patients/:id - Delete patient and cascade vitals/labs
  app.fastify.delete<{
    Params: { id: string };
    Reply: { success: boolean };
  }>(
    '/api/patients/:id',
    {
      schema: {
        description: 'Delete a patient and all associated data',
        tags: ['patients'],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: { success: { type: 'boolean' } },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };

      app.logger.info(
        { userId: session.user.id, patientId: id },
        'Deleting patient'
      );

      // Verify ownership
      const patient = await app.db.query.patients.findFirst({
        where: and(
          eq(schema.patients.id, id),
          eq(schema.patients.userId, session.user.id)
        ),
      });

      if (!patient) {
        app.logger.warn(
          { userId: session.user.id, patientId: id },
          'Patient not found or not owned by user'
        );
        return reply.status(404).send({ error: 'Patient not found' });
      }

      // Delete cascade is handled by database foreign keys
      await app.db.delete(schema.patients).where(eq(schema.patients.id, id));

      app.logger.info(
        { userId: session.user.id, patientId: id },
        'Patient deleted successfully'
      );

      return { success: true };
    }
  );
}
