import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerProfileRoutes } from './routes/profile.js';
import { registerPatientRoutes } from './routes/patients.js';
import { registerVitalsRoutes } from './routes/vitals.js';
import { registerLabsRoutes } from './routes/labs.js';
import { registerUploadRoutes } from './routes/upload.js';

// Combine all schemas
const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication
app.withAuth();

// Enable storage for file uploads
app.withStorage();

// Register all routes
registerProfileRoutes(app);
registerPatientRoutes(app);
registerVitalsRoutes(app);
registerLabsRoutes(app);
registerUploadRoutes(app);

await app.run();
app.logger.info('Application running');
