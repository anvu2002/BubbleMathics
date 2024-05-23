import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BubbleMathics Express.js API',
      version: '1.0.0',
      description: 'API documentation for BubbleMathics Express backend',
    },
  },
  apis: [path.resolve(__dirname, './express.js')], // Absolute path to the API docs
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };
