/**
 * File Validation Utility
 * Provides functions to validate file type and size for lab result uploads
 */

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate file type by MIME type and extension
 * @param {Object} file - Express file object with mimetype and originalname
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
const validateFileType = (file) => {
  if (!file) {
    return {
      isValid: false,
      error: 'File is required'
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      isValid: false,
      error: `Invalid file type. Only PDF, JPG, and PNG are allowed. Received: ${file.mimetype}`
    };
  }

  // Check file extension
  const fileExtension = file.originalname.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return {
      isValid: false,
      error: `Invalid file extension. Only .pdf, .jpg, .jpeg, and .png are allowed. Received: .${fileExtension}`
    };
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Validate file size
 * @param {Object} file - Express file object with size property
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
const validateFileSize = (file) => {
  if (!file) {
    return {
      isValid: false,
      error: 'File is required'
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File size exceeds maximum limit. Maximum: ${maxSizeMB}MB, Received: ${fileSizeMB}MB`
    };
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Validate file comprehensively (type and size)
 * @param {Object} file - Express file object
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
const validateFile = (file) => {
  // Validate type
  const typeValidation = validateFileType(file);
  if (!typeValidation.isValid) {
    return typeValidation;
  }

  // Validate size
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Get file information
 * @param {Object} file - Express file object
 * @returns {Object} - File information
 */
const getFileInfo = (file) => {
  if (!file) {
    return null;
  }

  const fileExtension = file.originalname.split('.').pop().toLowerCase();
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    extension: fileExtension,
    size: file.size,
    sizeMB: fileSizeMB,
    encoding: file.encoding
  };
};

module.exports = {
  validateFileType,
  validateFileSize,
  validateFile,
  getFileInfo,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE
};
