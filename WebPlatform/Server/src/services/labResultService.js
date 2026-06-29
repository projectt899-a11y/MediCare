/**
 * Lab Result Service
 * Handles all lab result operations including submission, retrieval, and file management
 */

const { createClient } = require('@supabase/supabase-js');
const fileUploadUtil = require('../utils/fileUploadUtil');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Submit a lab result (file upload or manual entry)
 */
const submitLabResult = async (requestId, resultData) => {
  try {
    const {
      resultType,
      filePath,
      fileName,
      fileSize,
      resultValues,
      doctorVisibleNotes,
      internalLabNotes,
      submittedBy,
      labId
    } = resultData;

    // Validate result has content
    if (resultType === 'File Upload' && !filePath) {
      throw new Error('File path is required for file upload results');
    }

    if (resultType === 'Manual Entry' && !resultValues) {
      throw new Error('Result values are required for manual entry results');
    }

    // Create the lab result record
    const { data: result, error: resultError } = await supabase
      .from('lab_results')
      .insert({
        lab_request_id: requestId,
        lab_id: labId,
        result_type: resultType,
        file_path: filePath || null,
        file_name: fileName || null,
        file_size: fileSize || null,
        result_values: resultValues || null,
        doctor_visible_notes: doctorVisibleNotes || null,
        internal_lab_notes: internalLabNotes || null,
        submitted_by: submittedBy,
        submitted_at: new Date().toISOString(),
        is_draft: false,
        version: 1
      })
      .select()
      .single();

    if (resultError) throw resultError;

    // Update the lab request status to "Completed"
    console.log('[labResultService.submitLabResult] updating request status to Completed — requestId:', requestId);
    const { data: updatedRequest, error: updateError } = await supabase
      .from('lab_requests')
      .update({
        status: 'Completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      console.error('[labResultService.submitLabResult] status update FAILED:', updateError);
      throw updateError;
    }
    console.log('[labResultService.submitLabResult] status updated successfully — new status:', updatedRequest?.status);

    return {
      result,
      request: updatedRequest
    };
  } catch (error) {
    console.error('Error submitting lab result:', error);
    throw error;
  }
};

/**
 * Get lab result by ID
 */
const getLabResultById = async (resultId) => {
  try {
    const { data, error } = await supabase
      .from('lab_results')
      .select('*')
      .eq('id', resultId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Result not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting lab result by ID:', error);
    throw error;
  }
};

/**
 * Get lab result by request ID
 */
const getLabResultByRequestId = async (requestId) => {
  try {
    const { data, error } = await supabase
      .from('lab_results')
      .select('*')
      .eq('lab_request_id', requestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Result not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting lab result by request ID:', error);
    throw error;
  }
};

/**
 * Save lab result as draft
 */
const saveDraftResult = async (requestId, resultData) => {
  try {
    const {
      resultType,
      filePath,
      fileName,
      fileSize,
      resultValues,
      doctorVisibleNotes,
      internalLabNotes,
      submittedBy,
      labId
    } = resultData;

    // Check if draft already exists
    const { data: existingResult, error: checkError } = await supabase
      .from('lab_results')
      .select('id, version')
      .eq('lab_request_id', requestId)
      .single();

    if (existingResult) {
      // Update existing draft
      const { data: updated, error: updateError } = await supabase
        .from('lab_results')
        .update({
          result_type: resultType,
          file_path: filePath || null,
          file_name: fileName || null,
          file_size: fileSize || null,
          result_values: resultValues || null,
          doctor_visible_notes: doctorVisibleNotes || null,
          internal_lab_notes: internalLabNotes || null,
          is_draft: true,
          version: existingResult.version + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingResult.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updated;
    } else {
      // Create new draft
      const { data: created, error: createError } = await supabase
        .from('lab_results')
        .insert({
          lab_request_id: requestId,
          lab_id: labId,
          result_type: resultType,
          file_path: filePath || null,
          file_name: fileName || null,
          file_size: fileSize || null,
          result_values: resultValues || null,
          doctor_visible_notes: doctorVisibleNotes || null,
          internal_lab_notes: internalLabNotes || null,
          submitted_by: submittedBy,
          submitted_at: new Date().toISOString(),
          is_draft: true,
          version: 1
        })
        .select()
        .single();

      if (createError) throw createError;
      return created;
    }
  } catch (error) {
    console.error('Error saving draft result:', error);
    throw error;
  }
};

/**
 * Update lab result
 */
const updateLabResult = async (resultId, updateData) => {
  try {
    const allowedFields = [
      'result_type',
      'file_path',
      'file_name',
      'file_size',
      'result_values',
      'doctor_visible_notes',
      'internal_lab_notes',
      'is_draft'
    ];

    const updateObject = {};

    for (const field of allowedFields) {
      if (field in updateData) {
        updateObject[field] = updateData[field];
      }
    }

    updateObject.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('lab_results')
      .update(updateObject)
      .eq('id', resultId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Result not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating lab result:', error);
    throw error;
  }
};

/**
 * Upload file to Supabase Storage
 */
const uploadResultFile = async (file, labId, requestId) => {
  try {
    if (!file) {
      throw new Error('File is required');
    }

    // Use the file upload utility
    const uploadResult = await fileUploadUtil.uploadFileToStorage(file, labId, requestId);

    return uploadResult;
  } catch (error) {
    console.error('Error uploading result file:', error);
    throw error;
  }
};

/**
 * Generate signed URL for file download
 */
const generateSignedUrl = async (filePath, expirationSeconds = 86400) => {
  try {
    // Use the file upload utility
    const signedUrl = await fileUploadUtil.generateSignedUrl(filePath, expirationSeconds);
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

/**
 * Delete result file from storage
 */
const deleteResultFile = async (filePath) => {
  try {
    // Use the file upload utility
    const result = await fileUploadUtil.deleteFileFromStorage(filePath);
    return result;
  } catch (error) {
    console.error('Error deleting result file:', error);
    throw error;
  }
};

module.exports = {
  submitLabResult,
  getLabResultById,
  getLabResultByRequestId,
  saveDraftResult,
  updateLabResult,
  uploadResultFile,
  generateSignedUrl,
  deleteResultFile
};
