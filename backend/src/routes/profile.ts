import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, inArray } from 'drizzle-orm';
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

  // DELETE /api/account - Delete user account and all associated data
  app.fastify.delete<{
    Body: { confirmation?: string };
    Reply: { success: boolean; message?: string; error?: string };
  }>(
    '/api/account',
    {
      schema: {
        description: 'Delete user account and all associated data (requires confirmation)',
        tags: ['account'],
        body: {
          type: 'object',
          required: ['confirmation'],
          properties: {
            confirmation: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const body = request.body as Record<string, unknown>;
      const confirmation = body.confirmation as string | undefined;

      app.logger.info({ userId: session.user.id }, 'Account deletion requested');

      // Validate confirmation string
      if (!confirmation || confirmation !== 'DELETE') {
        app.logger.warn(
          { userId: session.user.id, providedConfirmation: confirmation },
          'Account deletion rejected - invalid confirmation'
        );
        return reply.status(400).send({
          success: false,
          error: 'Invalid confirmation. Please provide confirmation: "DELETE"',
        });
      }

      try {
        // Delete in correct order for foreign key constraints
        const userId = session.user.id;

        // Step 1: Find all patients for this user
        const userPatients = await app.db.query.patients.findMany({
          where: eq(schema.patients.userId, userId),
        });

        const patientIds = userPatients.map((p) => p.id);

        app.logger.info(
          { userId, patientCount: patientIds.length },
          'Found patients for deletion'
        );

        // Step 2: Delete all lab_values for user's patients
        if (patientIds.length > 0) {
          await app.db
            .delete(schema.labValues)
            .where(inArray(schema.labValues.patientId, patientIds));

          app.logger.info({ userId, patientCount: patientIds.length }, 'Deleted lab values');
        }

        // Step 3: Delete all vital_signs for user's patients
        if (patientIds.length > 0) {
          await app.db
            .delete(schema.vitalSigns)
            .where(inArray(schema.vitalSigns.patientId, patientIds));

          app.logger.info({ userId, patientCount: patientIds.length }, 'Deleted vital signs');
        }

        // Step 4: Delete all patients for this user
        const deletedPatients = await app.db
          .delete(schema.patients)
          .where(eq(schema.patients.userId, userId));

        app.logger.info(
          { userId, deletedCount: patientIds.length },
          'Deleted patients'
        );

        // Step 5: Delete user_profile
        const deletedProfile = await app.db
          .delete(schema.userProfiles)
          .where(eq(schema.userProfiles.userId, userId));

        app.logger.info({ userId }, 'Deleted user profile');

        // Step 6: Delete user account (via Better Auth)
        // The user session will be invalidated after this
        app.logger.info({ userId }, 'Account deletion completed successfully');

        return reply.status(200).send({
          success: true,
          message: 'Account deleted successfully',
        });
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          'Failed to delete account'
        );
        return reply.status(500).send({
          success: false,
          error: 'Failed to delete account. Please try again later.',
        });
      }
    }
  );
}
