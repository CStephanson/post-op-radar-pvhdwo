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

      app.logger.info({ userId: session.user.id, profileId: profile.id }, 'Profile retrieved');
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
        { userId: session.user.id, body },
        'Creating profile'
      );

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
    };
    Reply: typeof schema.userProfiles.$inferSelect | null;
  }>(
    '/api/profile',
    {
      schema: {
        description: 'Update user profile',
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
      const fullName = body.fullName as string | undefined;
      const pronouns = body.pronouns as string | undefined;
      const role = body.role as 'medical_student' | 'resident' | 'fellow' | 'staff_physician' | undefined;
      const roleYear = body.roleYear as number | undefined;
      const residencyProgram = body.residencyProgram as string | undefined;
      const affiliation = body.affiliation as string | undefined;
      const profilePicture = body.profilePicture as string | undefined;

      app.logger.info(
        { userId: session.user.id, body },
        'Updating profile'
      );

      const updateData = {
        ...(fullName && { fullName }),
        ...(pronouns !== undefined && { pronouns }),
        ...(role && { role }),
        ...(roleYear !== undefined && { roleYear }),
        ...(residencyProgram !== undefined && {
          residencyProgram,
        }),
        ...(affiliation !== undefined && { affiliation }),
        ...(profilePicture !== undefined && {
          profilePicture,
        }),
      };

      const [profile] = await app.db
        .update(schema.userProfiles)
        .set(updateData)
        .where(eq(schema.userProfiles.userId, session.user.id))
        .returning();

      if (!profile) {
        app.logger.info({ userId: session.user.id }, 'Profile not found for update');
        return null;
      }

      app.logger.info(
        { userId: session.user.id, profileId: profile.id },
        'Profile updated successfully'
      );

      return profile;
    }
  );
}
