import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env.js';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Travel Agency + Hotel Booking Management System API',
      version: '1.0.0',
      description:
        'REST API for hotel booking, travel agency, tour, transport, payment and reporting operations.',
    },
    servers: [{ url: `http://localhost:${env.port}${env.apiPrefix}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
});
