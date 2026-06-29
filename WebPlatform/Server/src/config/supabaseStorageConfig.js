/**
 * Supabase Storage Configuration
 * Defines bucket settings, policies, and CORS configuration for lab result file storage
 */

const BUCKET_NAME = 'lab-results';

/**
 * Bucket configuration
 */
const bucketConfig = {
  name: BUCKET_NAME,
  public: false, // Private bucket - access via signed URLs only
  fileSizeLimit: 10 * 1024 * 1024, // 10MB max file size
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png'
  ],
  allowedExtensions: [
    'pdf',
    'jpg',
    'jpeg',
    'png'
  ]
};

/**
 * Bucket policies for authenticated access
 * These policies define who can perform what actions on the bucket
 */
const bucketPolicies = [
  {
    name: 'Lab staff can upload files',
    definition: {
      role: 'authenticated',
      action: 'INSERT',
      check: `(auth.uid() IN (
        SELECT user_id FROM lab_staff WHERE is_deleted = false
      ))`
    }
  },
  {
    name: 'Lab staff can read their lab files',
    definition: {
      role: 'authenticated',
      action: 'SELECT',
      check: `(
        (auth.uid() IN (
          SELECT user_id FROM lab_staff WHERE is_deleted = false
        )) OR
        (auth.uid() IN (
          SELECT doctor_id FROM lab_requests WHERE lab_results.lab_request_id = lab_requests.id
        )) OR
        (auth.uid() IN (
          SELECT patient_id FROM lab_requests WHERE lab_results.lab_request_id = lab_requests.id
        ))
      )`
    }
  },
  {
    name: 'Lab staff can delete their lab files',
    definition: {
      role: 'authenticated',
      action: 'DELETE',
      check: `(auth.uid() IN (
        SELECT user_id FROM lab_staff WHERE is_deleted = false
      ))`
    }
  }
];

/**
 * CORS configuration for file uploads
 */
const corsConfig = {
  allowedOrigins: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    process.env.ADMIN_URL || 'http://localhost:5174'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-info'],
  exposedHeaders: ['Content-Length', 'x-amz-version-id'],
  maxAge: 3600,
  credentials: true
};

/**
 * Encryption settings
 */
const encryptionConfig = {
  enabled: true,
  algorithm: 'AES-256-GCM',
  keyRotationDays: 90
};

/**
 * File path structure
 * Format: {lab_id}/{request_id}/{timestamp}_{filename}
 * Example: 550e8400-e29b-41d4-a716-446655440000/660e8400-e29b-41d4-a716-446655440001/2024-01-15T14:30:45_blood_test.pdf
 */
const filePathStructure = {
  pattern: '{lab_id}/{request_id}/{timestamp}_{filename}',
  example: '550e8400-e29b-41d4-a716-446655440000/660e8400-e29b-41d4-a716-446655440001/2024-01-15T14:30:45_blood_test.pdf',
  description: 'Hierarchical structure for organizing files by lab and request'
};

/**
 * Signed URL configuration
 */
const signedUrlConfig = {
  expirationSeconds: 86400, // 24 hours
  maxExpirationSeconds: 604800 // 7 days max
};

/**
 * Retention policies
 */
const retentionPolicies = {
  draft: {
    days: 7,
    description: 'Delete draft results after 7 days of inactivity'
  },
  rejected: {
    days: 365,
    description: 'Delete rejected results after 1 year'
  },
  completed: {
    days: 2555, // 7 years
    description: 'Retain completed results for 7 years (compliance requirement)'
  }
};

module.exports = {
  BUCKET_NAME,
  bucketConfig,
  bucketPolicies,
  corsConfig,
  encryptionConfig,
  filePathStructure,
  signedUrlConfig,
  retentionPolicies
};
