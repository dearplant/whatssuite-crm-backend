#!/usr/bin/env node

/**
 * Watch Swagger Files
 * Automatically regenerates swagger.json when route files change
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to watch
const watchDirs = [
  path.join(__dirname, '..', 'src', 'routes'),
  path.join(__dirname, '..', 'src', 'controllers'),
  path.join(__dirname, '..', 'src', 'docs'),
];

// Debounce timer
let debounceTimer = null;
const DEBOUNCE_DELAY = 1000; // 1 second

/**
 * Generate Swagger JSON
 */
async function generateSwagger() {
  try {
    console.log('🔄 Regenerating Swagger JSON...');
    const { stdout, stderr } = await execAsync('node scripts/generate-swagger.js', {
      cwd: path.join(__dirname, '..'),
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error('❌ Error generating Swagger:', error.message);
  }
}

/**
 * Debounced file change handler
 */
function handleFileChange(eventType, filename) {
  if (!filename || !filename.endsWith('.js')) return;
  
  console.log(`📝 File changed: ${filename}`);
  
  // Clear existing timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  // Set new timer
  debounceTimer = setTimeout(() => {
    generateSwagger();
  }, DEBOUNCE_DELAY);
}

/**
 * Start watching directories
 */
function startWatching() {
  console.log('👀 Watching for route file changes...');
  console.log('📁 Watching directories:');
  
  watchDirs.forEach((dir) => {
    if (fs.existsSync(dir)) {
      console.log(`   - ${dir}`);
      fs.watch(dir, { recursive: false }, handleFileChange);
    } else {
      console.warn(`⚠️  Directory not found: ${dir}`);
    }
  });
  
  console.log('\n✨ Swagger watcher is running. Press Ctrl+C to stop.\n');
  
  // Generate initial swagger.json
  generateSwagger();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Stopping Swagger watcher...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Stopping Swagger watcher...');
  process.exit(0);
});

// Start the watcher
startWatching();
