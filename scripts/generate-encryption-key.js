#!/usr/bin/env node

/**
 * Generate Encryption Key Script
 * 
 * This script generates a secure 32-byte (64 hex character) encryption key
 * for encrypting WhatsApp session data.
 * 
 * Usage:
 *   node scripts/generate-encryption-key.js
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(70));
console.log('WhatsApp CRM - Encryption Key Generator');
console.log('='.repeat(70));
console.log();

// Generate a secure 32-byte key
const encryptionKey = crypto.randomBytes(32).toString('hex');

console.log('✅ Generated secure encryption key:');
console.log();
console.log('ENCRYPTION_KEY=' + encryptionKey);
console.log();
console.log('='.repeat(70));
console.log('IMPORTANT INSTRUCTIONS:');
console.log('='.repeat(70));
console.log();
console.log('1. Copy the ENCRYPTION_KEY line above');
console.log('2. Add it to your .env file');
console.log('3. NEVER commit this key to version control');
console.log('4. NEVER change this key after WhatsApp sessions are created');
console.log('5. Store this key securely (password manager, secrets vault)');
console.log();
console.log('⚠️  WARNING:');
console.log('   - Changing this key will invalidate ALL WhatsApp sessions');
console.log('   - Users will need to re-authenticate with QR codes');
console.log('   - Keep backups of this key in a secure location');
console.log();

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 .env file not found. Creating from .env.example...');
  
  if (fs.existsSync(envExamplePath)) {
    try {
      let envContent = fs.readFileSync(envExamplePath, 'utf-8');
      
      // Replace the placeholder encryption key
      envContent = envContent.replace(
        /ENCRYPTION_KEY=.*/,
        `ENCRYPTION_KEY=${encryptionKey}`
      );
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Created .env file with encryption key');
      console.log();
    } catch (error) {
      console.error('❌ Error creating .env file:', error.message);
      console.log('   Please create .env manually and add the key above');
      console.log();
    }
  } else {
    console.log('⚠️  .env.example not found. Please create .env manually');
    console.log();
  }
} else {
  console.log('📝 .env file exists. Please update it manually with the key above');
  console.log();
  
  // Check if ENCRYPTION_KEY is already set
  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    if (envContent.includes('ENCRYPTION_KEY=') && 
        !envContent.includes('ENCRYPTION_KEY=generate_a_secure') &&
        !envContent.includes('ENCRYPTION_KEY=your-32-character')) {
      console.log('⚠️  WARNING: ENCRYPTION_KEY already exists in .env');
      console.log('   Only replace it if you want to invalidate all sessions!');
      console.log();
    }
  } catch (error) {
    console.error('❌ Error reading .env file:', error.message);
  }
}

console.log('='.repeat(70));
console.log('Next Steps:');
console.log('='.repeat(70));
console.log();
console.log('1. Verify ENCRYPTION_KEY is set in .env');
console.log('2. Start the application: npm start');
console.log('3. Check logs for "WhatsApp service initialized with secure encryption key"');
console.log();
console.log('For production deployment:');
console.log('- Use environment variables or secrets management');
console.log('- Never hardcode the key in your application');
console.log('- Rotate keys periodically (requires re-authentication)');
console.log();
