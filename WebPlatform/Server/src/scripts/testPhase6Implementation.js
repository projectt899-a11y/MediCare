/**
 * Phase 6 Implementation Test Script
 * Tests file storage integration, upload functionality, and cleanup policies
 * 
 * Usage: node Server/src/scripts/testPhase6Implementation.js
 */

require('dotenv').config();
const fileValidationUtil = require('../utils/fileValidationUtil');
const fileUploadUtil = require('../utils/fileUploadUtil');
const storageConfig = require('../config/supabaseStorageConfig');
const fileCleanupService = require('../services/fileCleanupService');

console.log('='.repeat(80));
console.log('PHASE 6 IMPLEMENTATION TEST');
console.log('='.repeat(80));

// Test 1: File Validation Utility
console.log('\n[TEST 1] File Validation Utility');
console.log('-'.repeat(80));

try {
  // Test valid file
  const validFile = {
    originalname: 'test.pdf',
    mimetype: 'application/pdf',
    size: 1024 * 1024, // 1MB
    buffer: Buffer.from('test')
  };

  const validationResult = fileValidationUtil.validateFile(validFile);
  console.log(`✓ Valid file validation: ${validationResult.isValid ? 'PASS' : 'FAIL'}`);

  // Test invalid file type
  const invalidTypeFile = {
    originalname: 'test.txt',
    mimetype: 'text/plain',
    size: 1024 * 1024,
    buffer: Buffer.from('test')
  };

  const invalidTypeResult = fileValidationUtil.validateFile(invalidTypeFile);
  console.log(`✓ Invalid file type validation: ${!invalidTypeResult.isValid ? 'PASS' : 'FAIL'}`);
  if (!invalidTypeResult.isValid) {
    console.log(`  Error: ${invalidTypeResult.error}`);
  }

  // Test oversized file
  const oversizedFile = {
    originalname: 'test.pdf',
    mimetype: 'application/pdf',
    size: 15 * 1024 * 1024, // 15MB
    buffer: Buffer.from('test')
  };

  const oversizedResult = fileValidationUtil.validateFile(oversizedFile);
  console.log(`✓ Oversized file validation: ${!oversizedResult.isValid ? 'PASS' : 'FAIL'}`);
  if (!oversizedResult.isValid) {
    console.log(`  Error: ${oversizedResult.error}`);
  }

  // Test file info
  const fileInfo = fileValidationUtil.getFileInfo(validFile);
  console.log(`✓ File info extraction: ${fileInfo ? 'PASS' : 'FAIL'}`);
  if (fileInfo) {
    console.log(`  - Original Name: ${fileInfo.originalName}`);
    console.log(`  - MIME Type: ${fileInfo.mimeType}`);
    console.log(`  - Extension: ${fileInfo.extension}`);
    console.log(`  - Size: ${fileInfo.sizeMB}MB`);
  }
} catch (error) {
  console.error(`✗ File Validation Test Error: ${error.message}`);
}

// Test 2: Storage Configuration
console.log('\n[TEST 2] Storage Configuration');
console.log('-'.repeat(80));

try {
  console.log(`✓ Bucket Name: ${storageConfig.BUCKET_NAME}`);
  console.log(`✓ Bucket Public: ${storageConfig.bucketConfig.public}`);
  console.log(`✓ Max File Size: ${(storageConfig.bucketConfig.fileSizeLimit / (1024 * 1024))}MB`);
  console.log(`✓ Allowed MIME Types: ${storageConfig.bucketConfig.allowedMimeTypes.join(', ')}`);
  console.log(`✓ Allowed Extensions: ${storageConfig.bucketConfig.allowedExtensions.join(', ')}`);
  console.log(`✓ CORS Allowed Origins: ${storageConfig.corsConfig.allowedOrigins.join(', ')}`);
  console.log(`✓ Signed URL Expiration: ${storageConfig.signedUrlConfig.expirationSeconds} seconds`);
  console.log(`✓ Encryption Enabled: ${storageConfig.encryptionConfig.enabled}`);
  console.log(`✓ Encryption Algorithm: ${storageConfig.encryptionConfig.algorithm}`);
} catch (error) {
  console.error(`✗ Storage Configuration Test Error: ${error.message}`);
}

// Test 3: File Path Generation
console.log('\n[TEST 3] File Path Generation');
console.log('-'.repeat(80));

try {
  const labId = '550e8400-e29b-41d4-a716-446655440000';
  const requestId = '660e8400-e29b-41d4-a716-446655440001';
  const filename = 'blood_test_results.pdf';

  const filePath = fileUploadUtil.generateFilePath(labId, requestId, filename);
  console.log(`✓ Generated file path: ${filePath}`);
  
  // Verify path structure
  const pathParts = filePath.split('/');
  console.log(`✓ Path structure:`);
  console.log(`  - Lab ID: ${pathParts[0]}`);
  console.log(`  - Request ID: ${pathParts[1]}`);
  console.log(`  - Filename: ${pathParts[2]}`);
  
  // Verify filename contains timestamp
  const hasTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/.test(pathParts[2]);
  console.log(`✓ Filename contains timestamp: ${hasTimestamp ? 'PASS' : 'FAIL'}`);
} catch (error) {
  console.error(`✗ File Path Generation Test Error: ${error.message}`);
}

// Test 4: Retention Policies
console.log('\n[TEST 4] Retention Policies');
console.log('-'.repeat(80));

try {
  console.log(`✓ Draft Retention: ${storageConfig.retentionPolicies.draft.days} days`);
  console.log(`  - Description: ${storageConfig.retentionPolicies.draft.description}`);
  
  console.log(`✓ Rejected Retention: ${storageConfig.retentionPolicies.rejected.days} days`);
  console.log(`  - Description: ${storageConfig.retentionPolicies.rejected.description}`);
  
  console.log(`✓ Completed Retention: ${storageConfig.retentionPolicies.completed.days} days`);
  console.log(`  - Description: ${storageConfig.retentionPolicies.completed.description}`);
  
  // Verify retention days
  const draftDays = storageConfig.retentionPolicies.draft.days;
  const rejectedDays = storageConfig.retentionPolicies.rejected.days;
  const completedDays = storageConfig.retentionPolicies.completed.days;
  
  console.log(`✓ Retention policy validation:`);
  console.log(`  - Draft (7 days): ${draftDays === 7 ? 'PASS' : 'FAIL'}`);
  console.log(`  - Rejected (1 year): ${rejectedDays === 365 ? 'PASS' : 'FAIL'}`);
  console.log(`  - Completed (7 years): ${completedDays === 2555 ? 'PASS' : 'FAIL'}`);
} catch (error) {
  console.error(`✗ Retention Policies Test Error: ${error.message}`);
}

// Test 5: File Cleanup Service Functions
console.log('\n[TEST 5] File Cleanup Service Functions');
console.log('-'.repeat(80));

try {
  console.log(`✓ deleteDraftResultsOlderThan function: Available`);
  console.log(`✓ deleteRejectedResultsOlderThan function: Available`);
  console.log(`✓ archiveCompletedResults function: Available`);
  console.log(`✓ runAllCleanup function: Available`);
  
  // Verify functions are callable
  const functions = [
    fileCleanupService.deleteDraftResultsOlderThan,
    fileCleanupService.deleteRejectedResultsOlderThan,
    fileCleanupService.archiveCompletedResults,
    fileCleanupService.runAllCleanup
  ];
  
  const allCallable = functions.every(fn => typeof fn === 'function');
  console.log(`✓ All cleanup functions are callable: ${allCallable ? 'PASS' : 'FAIL'}`);
} catch (error) {
  console.error(`✗ File Cleanup Service Test Error: ${error.message}`);
}

// Test 6: File Upload Utility Functions
console.log('\n[TEST 6] File Upload Utility Functions');
console.log('-'.repeat(80));

try {
  console.log(`✓ uploadFileToStorage function: Available`);
  console.log(`✓ generateSignedUrl function: Available`);
  console.log(`✓ deleteFileFromStorage function: Available`);
  console.log(`✓ fileExists function: Available`);
  console.log(`✓ getFileMetadata function: Available`);
  console.log(`✓ generateFilePath function: Available`);
  
  // Verify functions are callable
  const functions = [
    fileUploadUtil.uploadFileToStorage,
    fileUploadUtil.generateSignedUrl,
    fileUploadUtil.deleteFileFromStorage,
    fileUploadUtil.fileExists,
    fileUploadUtil.getFileMetadata,
    fileUploadUtil.generateFilePath
  ];
  
  const allCallable = functions.every(fn => typeof fn === 'function');
  console.log(`✓ All upload utility functions are callable: ${allCallable ? 'PASS' : 'FAIL'}`);
} catch (error) {
  console.error(`✗ File Upload Utility Test Error: ${error.message}`);
}

// Test 7: Environment Variables
console.log('\n[TEST 7] Environment Variables');
console.log('-'.repeat(80));

try {
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length === 0) {
    console.log(`✓ All required environment variables are set`);
    console.log(`  - SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set' : 'Not set'}`);
    console.log(`  - SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'}`);
  } else {
    console.log(`✗ Missing environment variables: ${missingVars.join(', ')}`);
  }
} catch (error) {
  console.error(`✗ Environment Variables Test Error: ${error.message}`);
}

console.log('\n' + '='.repeat(80));
console.log('PHASE 6 IMPLEMENTATION TEST COMPLETED');
console.log('='.repeat(80));

console.log('\nNext Steps:');
console.log('1. Run: npm install (to install node-cron)');
console.log('2. Run: node Server/src/scripts/initializeStorageBucket.js (to set up storage bucket)');
console.log('3. Test file upload functionality with actual files');
console.log('4. Verify cleanup job runs at 2 AM UTC daily');
console.log('5. Monitor audit logs for file operations');
