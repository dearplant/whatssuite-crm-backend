#!/usr/bin/env node

/**
 * Generate Swagger JSON
 * This script generates the swagger.json file from JSDoc comments in the codebase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerSpec from '../src/config/swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.join(__dirname, '..', 'swagger.json');

try {
  // Write the swagger spec to a JSON file
  fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2), 'utf8');
  
  console.log('✅ Swagger JSON generated successfully!');
  console.log(`📄 File location: ${outputPath}`);
  console.log(`📊 Total paths: ${Object.keys(swaggerSpec.paths || {}).length}`);
  console.log(`🏷️  Total tags: ${(swaggerSpec.tags || []).length}`);
  console.log(`📦 Total schemas: ${Object.keys(swaggerSpec.components?.schemas || {}).length}`);
} catch (error) {
  console.error('❌ Error generating Swagger JSON:', error.message);
  process.exit(1);
}
