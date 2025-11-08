/**
 * File Upload Utility
 * Handles file uploads to S3 or Cloudinary
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import awsConfig from '../config/aws.config.js';
import logger from './logger.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Initialize S3 client if AWS is configured
let s3Client = null;
if (awsConfig.enabled && awsConfig.s3.bucket) {
  s3Client = new S3Client({
    region: awsConfig.s3.region,
    credentials: {
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey,
    },
  });
}

/**
 * Upload file to S3
 * @param {Object} file - File object (from multer or similar)
 * @param {string} folder - Folder name in S3
 * @returns {Promise<Object>} Upload result with URL
 */
export async function uploadToS3(file, folder = 'messages') {
  if (!s3Client) {
    throw new Error('AWS S3 is not configured');
  }

  try {
    // Generate unique filename
    const fileExtension = path.extname(file.originalname || file.name || '');
    const fileName = `${uuidv4()}${fileExtension}`;
    const key = `${awsConfig.s3.folders[folder] || folder}/${fileName}`;

    // Validate file size
    if (file.size > awsConfig.s3.maxFileSize) {
      throw new Error(
        `File size exceeds maximum allowed size of ${awsConfig.s3.maxFileSize} bytes`
      );
    }

    // Validate MIME type
    if (file.mimetype && !awsConfig.s3.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: awsConfig.s3.bucket,
      Key: key,
      Body: file.buffer || file.data,
      ContentType: file.mimetype || file.type,
      ACL: awsConfig.s3.acl,
      StorageClass: awsConfig.s3.storageClass,
    });

    await s3Client.send(command);

    // Generate URL
    const url =
      awsConfig.s3.cloudFront.enabled && awsConfig.s3.cloudFront.domain
        ? `https://${awsConfig.s3.cloudFront.domain}/${key}`
        : `https://${awsConfig.s3.bucket}.s3.${awsConfig.s3.region}.amazonaws.com/${key}`;

    logger.info('File uploaded to S3', {
      key,
      size: file.size,
      mimetype: file.mimetype,
    });

    return {
      url,
      key,
      bucket: awsConfig.s3.bucket,
      size: file.size,
      mimetype: file.mimetype,
    };
  } catch (error) {
    logger.error('Failed to upload file to S3', {
      error: error.message,
      folder,
    });
    throw error;
  }
}

/**
 * Upload file to Cloudinary (alternative to S3)
 * @param {Object} file - File object
 * @param {string} folder - Folder name
 * @returns {Promise<Object>} Upload result with URL
 */
export async function uploadToCloudinary(file, folder = 'messages') {
  // Placeholder for Cloudinary implementation
  // This would require cloudinary package and configuration
  throw new Error('Cloudinary upload not implemented yet');
}

/**
 * Delete file from S3
 * @param {string} key - S3 object key
 * @returns {Promise<void>}
 */
export async function deleteFromS3(key) {
  if (!s3Client) {
    throw new Error('AWS S3 is not configured');
  }

  try {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new DeleteObjectCommand({
      Bucket: awsConfig.s3.bucket,
      Key: key,
    });

    await s3Client.send(command);

    logger.info('File deleted from S3', { key });
  } catch (error) {
    logger.error('Failed to delete file from S3', {
      error: error.message,
      key,
    });
    throw error;
  }
}

/**
 * Get signed URL for private file access
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration in seconds
 * @returns {Promise<string>} Signed URL
 */
export async function getSignedUrl(key, expiresIn = 3600) {
  if (!s3Client) {
    throw new Error('AWS S3 is not configured');
  }

  try {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');

    const command = new GetObjectCommand({
      Bucket: awsConfig.s3.bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    logger.debug('Generated signed URL', { key, expiresIn });

    return url;
  } catch (error) {
    logger.error('Failed to generate signed URL', {
      error: error.message,
      key,
    });
    throw error;
  }
}

export default {
  uploadToS3,
  uploadToCloudinary,
  deleteFromS3,
  getSignedUrl,
};
