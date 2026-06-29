/**
 * File Upload Utility
 * Provides functions to upload files to Supabase Storage with validation
 */

const { createClient } = require('@supabase/supabase-js');
const fileValidationUtil = require('./fileValidationUtil');
const storageConfig = require('../config/supabaseStorageConfig');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Generate unique file path with timestamp
 * Format: {lab_id}/{request_id}/{timestamp}_{filename}
 * @param {string} labId - Lab ID
 * @param {string} requestId - Lab request ID
 * @param {string} originalFilename - Original filename
 * @returns {string} - Unique file path
 */
const generateFilePath = (labId, requestId, originalFilename) => {
  // Generate ISO timestamp and replace colons with hyphens for filesystem compatibility
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('Z')[0];
  
  // Extract filename without extension
  const filenameParts = originalFilename.split('.');
  const extension = filenameParts.pop();
  const filenameWithoutExt = filenameParts.join('.');
  
  // Create unique filename
  const uniqueFilename = `${timestamp}_${filenameWithoutExt}.${extension}`;
  
  // Create full path
  const filePath = `${labId}/${requestId}/${uniqueFilename}`;
  
  return filePath;
};

/**
 * Upload file to Supabase Storage
 * @param {Object} file - Express file object
 * @param {string} labId - Lab ID
 * @param {string} requestId - Lab request ID
 * @returns {Promise<Object>} - { filePath, fileName, fileSize, mimeType }
 * @throws {Error} - If validation fails or upload fails
 */
const uploadFileToStorage = async (file, labId, requestId) => {
  try {
    // Validate inputs
    if (!file) {
      throw new Error('File is required');
    }

    if (!labId) {
      throw new Error('Lab ID is required');
    }

    if (!requestId) {
      throw new Error('Request ID is required');
    }

    // Validate file
    const validation = fileValidationUtil.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Generate unique file path
    const filePath = generateFilePath(labId, requestId, file.originalname);

    // Upload file to Supabase Storage
    const { data, error } = await supabase
      .storage
      .from(storageConfig.BUCKET_NAME)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
        cacheControl: '3600'
      });

    if (error) {
      throw new Error(`Failed to upload file to storage: ${error.message}`);
    }

    // Return file metadata
    return {
      filePath: data.path,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error uploading file to storage:', error);
    throw error;
  }
};

/**
 * Generate signed URL for file download
 * @param {string} filePath - File path in storage
 * @param {number} expirationSeconds - URL expiration time in seconds (default: 24 hours)
 * @returns {Promise<string>} - Signed URL
 * @throws {Error} - If URL generation fails
 */
const generateSignedUrl = async (filePath, expirationSeconds = 86400) => {
  try {
    if (!filePath) {
      throw new Error('File path is required');
    }

    // Validate expiration time
    if (expirationSeconds > storageConfig.signedUrlConfig.maxExpirationSeconds) {
      throw new Error(
        `Expiration time exceeds maximum of ${storageConfig.signedUrlConfig.maxExpirationSeconds} seconds`
      );
    }

    const { data, error } = await supabase
      .storage
      .from(storageConfig.BUCKET_NAME)
      .createSignedUrl(filePath, expirationSeconds);

    if (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

/**
 * Delete file from storage
 * @param {string} filePath - File path in storage
 * @returns {Promise<boolean>} - True if deletion successful
 * @throws {Error} - If deletion fails
 */
const deleteFileFromStorage = async (filePath) => {
  try {
    if (!filePath) {
      throw new Error('File path is required');
    }

    const { error } = await supabase
      .storage
      .from(storageConfig.BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete file from storage: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting file from storage:', error);
    throw error;
  }
};

/**
 * Check if file exists in storage
 * @param {string} filePath - File path in storage
 * @returns {Promise<boolean>} - True if file exists
 */
const fileExists = async (filePath) => {
  try {
    if (!filePath) {
      return false;
    }

    const { data, error } = await supabase
      .storage
      .from(storageConfig.BUCKET_NAME)
      .list(filePath.substring(0, filePath.lastIndexOf('/')));

    if (error) {
      return false;
    }

    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    return data.some(file => file.name === fileName);
  } catch (error) {
    console.error('Error checking if file exists:', error);
    return false;
  }
};

/**
 * Get file metadata
 * @param {string} filePath - File path in storage
 * @returns {Promise<Object>} - File metadata
 * @throws {Error} - If metadata retrieval fails
 */
const getFileMetadata = async (filePath) => {
  try {
    if (!filePath) {
      throw new Error('File path is required');
    }

    // List files in the directory to get metadata
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);

    const { data, error } = await supabase
      .storage
      .from(storageConfig.BUCKET_NAME)
      .list(dirPath);

    if (error) {
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }

    const fileMetadata = data.find(file => file.name === fileName);
    if (!fileMetadata) {
      throw new Error('File not found');
    }

    return fileMetadata;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw error;
  }
};

module.exports = {
  uploadFileToStorage,
  generateSignedUrl,
  deleteFileFromStorage,
  fileExists,
  getFileMetadata,
  generateFilePath
};
