import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerProfileRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/profile - Returns user profile
  app.fastify.get<{ Reply: typeof schema.userProfiles.$inferSelect | null }>(
    '/api/profile',
    {
      schema: {
        description: 'Get user profile',
        tags: ['profile'],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              fullName: { type: 'string' },
              pronouns: { type: 'string' },
              role: { type: 'string', enum: ['medical_student', 'resident', 'fellow', 'staff_physician'] },
              roleYear: { type: 'integer' },
              residencyProgram: { type: 'string' },
              affiliation: { type: 'string' },
              profilePicture: { type: 'string' },
              lastOpenedPatientId: { type: 'string' },
              lastOpenedAt: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching profile');

      const profile = await app.db.query.userProfiles.findFirst({
        where: eq(schema.userProfiles.userId, session.user.id),
      });

      if (!profile) {
        app.logger.info({ userId: session.user.id }, 'Profile not found');
        return null;
      }

      app.logger.info(
        { userId: session.user.id, profileId: profile.id, lastOpenedPatientId: profile.lastOpenedPatientId },
        'Profile retrieved'
      );
      return profile;
    }
  );

  // POST /api/profile - Create profile
  app.fastify.post<{
    Body: {
      fullName: string;
      pronouns?: string;
      role: 'medical_student' | 'resident' | 'fellow' | 'staff_physician';
      roleYear?: number;
      residencyProgram?: string;
      affiliation?: string;
      profilePicture?: string;
    };
    Reply: typeof schema.userProfiles.$inferSelect;
  }>(
    '/api/profile',
    {
      schema: {
        description: 'Create user profile',
        tags: ['profile'],
        body: {
          type: 'object',
          required: ['fullName', 'role'],
          properties: {
            fullName: { type: 'string' },
            pronouns: { type: 'string' },
            role: { type: 'string', enum: ['medical_student', 'resident', 'fellow', 'staff_physician'] },
            roleYear: { type: 'integer' },
            residencyProgram: { type: 'string' },
            affiliation: { type: 'string' },
            profilePicture: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              fullName: { type: 'string' },
              pronouns: { type: 'string' },
              role: { type: 'string' },
              roleYear: { type: 'integer' },
              residencyProgram: { type: 'string' },
              affiliation: { type: 'string' },
              profilePicture: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const body = request.body as Record<string, unknown>;
      const fullName = body.fullName as string;
      const pronouns = body.pronouns as string | undefined;
      const role = body.role as 'medical_student' | 'resident' | 'fellow' | 'staff_physician';
      const roleYear = body.roleYear as number | undefined;
      const residencyProgram = body.residencyProgram as string | undefined;
      const affiliation = body.affiliation as string | undefined;
      const profilePicture = body.profilePicture as string | undefined;

      app.logger.info(
        { userId: session.user.id, fullName },
        'Creating profile'
      );

      try {
        const [profile] = await app.db
          .insert(schema.userProfiles)
          .values({
            userId: session.user.id,
            fullName,
            pronouns,
            role,
            roleYear,
            residencyProgram,
            affiliation,
            profilePicture,
          })
          .returning();

        app.logger.info(
          { userId: session.user.id, profileId: profile.id },
          'Profile created successfully'
        );

        return profile;
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to create profile'
        );
        return reply.status(400).send({
          error: 'Failed to create profile - please try again',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // PUT /api/profile - Update profile
  app.fastify.put<{
    Body: {
      fullName?: string;
      pronouns?: string;
      role?: 'medical_student' | 'resident' | 'fellow' | 'staff_physician';
      roleYear?: number;
      residencyProgram?: string;
      affiliation?: string;
      profilePicture?: string;
      lastOpenedPatientId?: string;
      lastOpenedAt?: string;
    };
    Reply: typeof schema.userProfiles.$inferSelect;
  }>(
    '/api/profile',
    {
      schema: {
        description: 'Update user profile (including last opened patient tracking)',
        tags: ['profile'],
        body: {
          type: 'object',
          properties: {
            fullName: { type: 'string' },
            pronouns: { type: 'string' },
            role: { type: 'string', enum: ['medical_student', 'resident', 'fellow', 'staff_physician'] },
            roleYear: { type: 'integer' },
            residencyProgram: { type: 'string' },
            affiliation: { type: 'string' },
            profilePicture: { type: 'string' },
            lastOpenedPatientId: { type: 'string' },
            lastOpenedAt: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              fullName: { type: 'string' },
              pronouns: { type: 'string' },
              role: { type: 'string' },
              roleYear: { type: 'integer' },
              residencyProgram: { type: 'string' },
              affiliation: { type: 'string' },
              profilePicture: { type: 'string' },
              lastOpenedPatientId: { type: 'string' },
              lastOpenedAt: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const body = request.body as Record<string, unknown>;
      const fullName = body.fullName as string | undefined;
      const pronouns = body.pronouns as string | undefined;
      const role = body.role as 'medical_student' | 'resident' | 'fellow' | 'staff_physician' | undefined;
      const roleYear = body.roleYear as number | undefined;
      const residencyProgram = body.residencyProgram as string | undefined;
      const affiliation = body.affiliation as string | undefined;
      const profilePicture = body.profilePicture as string | undefined;
      const lastOpenedPatientId = body.lastOpenedPatientId as string | undefined;
      const lastOpenedAt = body.lastOpenedAt as string | undefined;

      app.logger.info(
        { userId: session.user.id, fieldsProvided: Object.keys(body).length },
        'Updating profile (atomic save)'
      );

      try {
        const updateData = {
          ...(fullName !== undefined && { fullName }),
          ...(pronouns !== undefined && { pronouns }),
          ...(role !== undefined && { role }),
          ...(roleYear !== undefined && { roleYear }),
          ...(residencyProgram !== undefined && { residencyProgram }),
          ...(affiliation !== undefined && { affiliation }),
          ...(profilePicture !== undefined && { profilePicture }),
          ...(lastOpenedPatientId !== undefined && { lastOpenedPatientId }),
          ...(lastOpenedAt !== undefined && { lastOpenedAt: new Date(lastOpenedAt) }),
        };

        const [profile] = await app.db
          .update(schema.userProfiles)
          .set(updateData)
          .where(eq(schema.userProfiles.userId, session.user.id))
          .returning();

        if (!profile) {
          app.logger.warn({ userId: session.user.id }, 'Profile not found for update');
          return reply.status(404).send({ error: 'Profile not found' });
        }

        app.logger.info(
          { userId: session.user.id, profileId: profile.id, savedFields: Object.keys(updateData).length },
          'Profile updated successfully (atomic)'
        );

        return profile;
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to update profile - atomic save failed'
        );
        return reply.status(400).send({
          error: 'Failed to save profile - please try again',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}
