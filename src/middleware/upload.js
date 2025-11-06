import multer from 'multer';
import path from 'path';
import { ValidationError } from './errorHandler.js';

/**
 * Configure multer for file uploads
 * Files are stored in memory for processing before uploading to S3/Cloudinary
 */
const storage = multer.memoryStorage();

/**
 * File filter to validate file types
 */
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Videos
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    // Audio
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ValidationError(
        `File type ${file.mimetype} is not allowed. Allowed types: images, videos, audio, documents`
      ),
      false
    );
  }
};

/**
 * Multer configuration
 */
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 5, // Maximum 5 files per request
  },
  fileFilter: fileFilter,
});

/**
 * Middleware for single file upload
 */
export const uploadSingle = (fieldName = 'file') => {
  return upload.single(fieldName);
};

/**
 * Middleware for multiple file uploads
 */
export const uploadMultiple = (fieldName = 'files', maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

/**
 * Middleware for multiple fields with files
 */
export const uploadFields = (fields) => {
  return upload.fields(fields);
};

/**
 * Error handler for multer errors
 */
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ValidationError('File size exceeds 10MB limit'));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new ValidationError('Too many files. Maximum 5 files allowed'));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ValidationError('Unexpected field in file upload'));
    }
    return next(new ValidationError(`File upload error: ${err.message}`));
  }
  next(err);
};

export default upload;
