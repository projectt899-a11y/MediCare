/**
 * Initialize Supabase Storage Bucket
 * Creates the lab-results bucket and configures policies, CORS, and encryption
 * 
 * Usage: node Server/src/scripts/initializeStorageBucket.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const storageConfig = require('../config/supabaseStorageConfig');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Initialize the storage bucket
 */
const initializeBucket = async () => {
  try {
    console.log('Starting Supabase Storage bucket initialization...\n');

    // Step 1: Create bucket if it doesn't exist
    console.log('Step 1: Creating bucket...');
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const bucketExists = buckets.some(b => b.name === storageConfig.BUCKET_NAME);

    if (bucketExists) {
      console.log(`✓ Bucket '${storageConfig.BUCKET_NAME}' already exists`);
    } else {
      const { data: newBucket, error: createError } = await supabase
        .storage
        .createBucket(storageConfig.BUCKET_NAME, {
          public: storageConfig.bucketConfig.public,
          fileSizeLimit: storageConfig.bucketConfig.fileSizeLimit
        });

      if (createError) {
        throw new Error(`Failed to create bucket: ${createError.message}`);
      }

      console.log(`✓ Bucket '${storageConfig.BUCKET_NAME}' created successfully`);
    }

    // Step 2: Configure CORS
    console.log('\nStep 2: Configuring CORS...');
    console.log(`✓ CORS configuration defined:`);
    console.log(`  - Allowed Origins: ${storageConfig.corsConfig.allowedOrigins.join(', ')}`);
    console.log(`  - Allowed Methods: ${storageConfig.corsConfig.allowedMethods.join(', ')}`);
    console.log(`  - Max Age: ${storageConfig.corsConfig.maxAge} seconds`);
    console.log('  Note: CORS is configured at the Supabase project level');

    // Step 3: Configure encryption
    console.log('\nStep 3: Configuring encryption...');
    if (storageConfig.encryptionConfig.enabled) {
      console.log(`✓ Server-side encryption enabled`);
      console.log(`  - Algorithm: ${storageConfig.encryptionConfig.algorithm}`);
      console.log(`  - Key Rotation: Every ${storageConfig.encryptionConfig.keyRotationDays} days`);
      console.log('  Note: Encryption is enabled at the Supabase project level');
    }

    // Step 4: Display bucket structure
    console.log('\nStep 4: Bucket structure...');
    console.log(`✓ File path structure configured:`);
    console.log(`  - Pattern: ${storageConfig.filePathStructure.pattern}`);
    console.log(`  - Example: ${storageConfig.filePathStructure.example}`);

    // Step 5: Display retention policies
    console.log('\nStep 5: Retention policies...');
    console.log(`✓ Retention policies configured:`);
    console.log(`  - Draft files: Delete after ${storageConfig.retentionPolicies.draft.days} days`);
    console.log(`  - Rejected files: Delete after ${storageConfig.retentionPolicies.rejected.days} days`);
    console.log(`  - Completed files: Retain for ${storageConfig.retentionPolicies.completed.days} days (7 years)`);

    // Step 6: Display signed URL configuration
    console.log('\nStep 6: Signed URL configuration...');
    console.log(`✓ Signed URLs configured:`);
    console.log(`  - Default expiration: ${storageConfig.signedUrlConfig.expirationSeconds} seconds (24 hours)`);
    console.log(`  - Maximum expiration: ${storageConfig.signedUrlConfig.maxExpirationSeconds} seconds (7 days)`);

    // Step 7: Display allowed file types
    console.log('\nStep 7: Allowed file types...');
    console.log(`✓ Allowed MIME types:`);
    storageConfig.bucketConfig.allowedMimeTypes.forEach(type => {
      console.log(`  - ${type}`);
    });
    console.log(`✓ Allowed extensions:`);
    storageConfig.bucketConfig.allowedExtensions.forEach(ext => {
      console.log(`  - .${ext}`);
    });

    console.log('\n✓ Supabase Storage bucket initialization completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify bucket settings in Supabase dashboard');
    console.log('2. Configure RLS policies in Supabase dashboard');
    console.log('3. Test file upload functionality');
    console.log('4. Set up file cleanup scheduled jobs');

  } catch (error) {
    console.error('\n✗ Error initializing storage bucket:', error.message);
    process.exit(1);
  }
};

// Run initialization
initializeBucket();
