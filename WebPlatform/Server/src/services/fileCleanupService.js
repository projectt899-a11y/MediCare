/**
 * File Cleanup Service
 * Handles deletion of old files based on retention policies
 */

const { createClient } = require('@supabase/supabase-js');
const fileUploadUtil = require('../utils/fileUploadUtil');
const labAuditLogService = require('./labAuditLogService');
const storageConfig = require('../config/supabaseStorageConfig');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Delete draft results older than specified days
 * @param {number} days - Number of days (default: 7)
 * @returns {Promise<Object>} - { deletedCount, errors }
 */
const deleteDraftResultsOlderThan = async (days = 7) => {
  try {
    console.log(`[File Cleanup] Starting deletion of draft results older than ${days} days...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateISO = cutoffDate.toISOString();

    // Find draft results older than cutoff date
    const { data: draftResults, error: queryError } = await supabase
      .from('lab_results')
      .select('id, file_path, lab_id, lab_request_id, submitted_by, created_at')
      .eq('is_draft', true)
      .lt('created_at', cutoffDateISO);

    if (queryError) {
      throw new Error(`Failed to query draft results: ${queryError.message}`);
    }

    console.log(`[File Cleanup] Found ${draftResults.length} draft results to delete`);

    let deletedCount = 0;
    const errors = [];

    // Delete each draft result
    for (const result of draftResults) {
      try {
        // Delete file from storage if it exists
        if (result.file_path) {
          try {
            await fileUploadUtil.deleteFileFromStorage(result.file_path);
            console.log(`[File Cleanup] Deleted file: ${result.file_path}`);
          } catch (fileError) {
            console.warn(`[File Cleanup] Warning: Could not delete file ${result.file_path}: ${fileError.message}`);
            // Continue even if file deletion fails
          }
        }

        // Delete result from database
        const { error: deleteError } = await supabase
          .from('lab_results')
          .delete()
          .eq('id', result.id);

        if (deleteError) {
          throw new Error(`Failed to delete result: ${deleteError.message}`);
        }

        // Log deletion in audit logs
        try {
          await labAuditLogService.logAction(
            result.submitted_by,
            'DELETE',
            'Lab Result',
            result.id,
            {
              action: 'draft_result_deleted_by_cleanup',
              reason: `Draft result older than ${days} days`,
              createdAt: result.created_at,
              deletedAt: new Date().toISOString()
            },
            null,
            'File Cleanup Job'
          );
        } catch (auditError) {
          console.warn(`[File Cleanup] Warning: Could not log deletion: ${auditError.message}`);
        }

        deletedCount++;
        console.log(`[File Cleanup] Deleted draft result: ${result.id}`);
      } catch (error) {
        console.error(`[File Cleanup] Error deleting draft result ${result.id}: ${error.message}`);
        errors.push({
          resultId: result.id,
          error: error.message
        });
      }
    }

    console.log(`[File Cleanup] Draft cleanup completed: ${deletedCount} deleted, ${errors.length} errors`);

    return {
      deletedCount,
      errors,
      type: 'draft'
    };
  } catch (error) {
    console.error('[File Cleanup] Error in deleteDraftResultsOlderThan:', error);
    throw error;
  }
};

/**
 * Delete rejected results older than specified days
 * @param {number} days - Number of days (default: 365 = 1 year)
 * @returns {Promise<Object>} - { deletedCount, errors }
 */
const deleteRejectedResultsOlderThan = async (days = 365) => {
  try {
    console.log(`[File Cleanup] Starting deletion of rejected results older than ${days} days...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateISO = cutoffDate.toISOString();

    // Find rejected requests older than cutoff date
    const { data: rejectedRequests, error: queryError } = await supabase
      .from('lab_requests')
      .select('id, lab_id, rejected_by, rejected_at')
      .eq('status', 'Rejected')
      .lt('rejected_at', cutoffDateISO);

    if (queryError) {
      throw new Error(`Failed to query rejected requests: ${queryError.message}`);
    }

    console.log(`[File Cleanup] Found ${rejectedRequests.length} rejected requests to process`);

    let deletedCount = 0;
    const errors = [];

    // Delete results for each rejected request
    for (const request of rejectedRequests) {
      try {
        // Get associated results
        const { data: results, error: resultsError } = await supabase
          .from('lab_results')
          .select('id, file_path, submitted_by')
          .eq('lab_request_id', request.id);

        if (resultsError) {
          throw new Error(`Failed to query results: ${resultsError.message}`);
        }

        // Delete each result
        for (const result of results) {
          try {
            // Delete file from storage if it exists
            if (result.file_path) {
              try {
                await fileUploadUtil.deleteFileFromStorage(result.file_path);
                console.log(`[File Cleanup] Deleted file: ${result.file_path}`);
              } catch (fileError) {
                console.warn(`[File Cleanup] Warning: Could not delete file ${result.file_path}: ${fileError.message}`);
              }
            }

            // Delete result from database
            const { error: deleteError } = await supabase
              .from('lab_results')
              .delete()
              .eq('id', result.id);

            if (deleteError) {
              throw new Error(`Failed to delete result: ${deleteError.message}`);
            }

            // Log deletion in audit logs
            try {
              await labAuditLogService.logAction(
                result.submitted_by,
                'DELETE',
                'Lab Result',
                result.id,
                {
                  action: 'rejected_result_deleted_by_cleanup',
                  reason: `Rejected result older than ${days} days`,
                  requestId: request.id,
                  rejectedAt: request.rejected_at,
                  deletedAt: new Date().toISOString()
                },
                null,
                'File Cleanup Job'
              );
            } catch (auditError) {
              console.warn(`[File Cleanup] Warning: Could not log deletion: ${auditError.message}`);
            }

            deletedCount++;
            console.log(`[File Cleanup] Deleted rejected result: ${result.id}`);
          } catch (error) {
            console.error(`[File Cleanup] Error deleting result ${result.id}: ${error.message}`);
            errors.push({
              resultId: result.id,
              requestId: request.id,
              error: error.message
            });
          }
        }
      } catch (error) {
        console.error(`[File Cleanup] Error processing rejected request ${request.id}: ${error.message}`);
        errors.push({
          requestId: request.id,
          error: error.message
        });
      }
    }

    console.log(`[File Cleanup] Rejected cleanup completed: ${deletedCount} deleted, ${errors.length} errors`);

    return {
      deletedCount,
      errors,
      type: 'rejected'
    };
  } catch (error) {
    console.error('[File Cleanup] Error in deleteRejectedResultsOlderThan:', error);
    throw error;
  }
};

/**
 * Archive completed results older than specified days
 * Note: This function logs the archival but doesn't delete files (7-year retention)
 * @param {number} days - Number of days (default: 2555 = 7 years)
 * @returns {Promise<Object>} - { archivedCount, errors }
 */
const archiveCompletedResults = async (days = 2555) => {
  try {
    console.log(`[File Cleanup] Starting archival of completed results older than ${days} days...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateISO = cutoffDate.toISOString();

    // Find completed results older than cutoff date
    const { data: completedResults, error: queryError } = await supabase
      .from('lab_results')
      .select('id, file_path, lab_id, lab_request_id, submitted_by, submitted_at')
      .eq('is_draft', false)
      .lt('submitted_at', cutoffDateISO);

    if (queryError) {
      throw new Error(`Failed to query completed results: ${queryError.message}`);
    }

    console.log(`[File Cleanup] Found ${completedResults.length} completed results to archive`);

    let archivedCount = 0;
    const errors = [];

    // Archive each completed result
    for (const result of completedResults) {
      try {
        // Log archival in audit logs
        try {
          await labAuditLogService.logAction(
            result.submitted_by,
            'UPDATE',
            'Lab Result',
            result.id,
            {
              action: 'completed_result_archived',
              reason: `Completed result older than ${days} days (7-year retention policy)`,
              submittedAt: result.submitted_at,
              archivedAt: new Date().toISOString()
            },
            null,
            'File Cleanup Job'
          );
        } catch (auditError) {
          console.warn(`[File Cleanup] Warning: Could not log archival: ${auditError.message}`);
        }

        archivedCount++;
        console.log(`[File Cleanup] Archived completed result: ${result.id}`);
      } catch (error) {
        console.error(`[File Cleanup] Error archiving result ${result.id}: ${error.message}`);
        errors.push({
          resultId: result.id,
          error: error.message
        });
      }
    }

    console.log(`[File Cleanup] Archival completed: ${archivedCount} archived, ${errors.length} errors`);

    return {
      archivedCount,
      errors,
      type: 'completed'
    };
  } catch (error) {
    console.error('[File Cleanup] Error in archiveCompletedResults:', error);
    throw error;
  }
};

/**
 * Run all cleanup operations
 * @returns {Promise<Object>} - Summary of all cleanup operations
 */
const runAllCleanup = async () => {
  try {
    console.log('[File Cleanup] Starting all cleanup operations...\n');

    const startTime = new Date();

    // Run all cleanup operations
    const draftCleanup = await deleteDraftResultsOlderThan(
      storageConfig.retentionPolicies.draft.days
    );

    const rejectedCleanup = await deleteRejectedResultsOlderThan(
      storageConfig.retentionPolicies.rejected.days
    );

    const completedArchive = await archiveCompletedResults(
      storageConfig.retentionPolicies.completed.days
    );

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000; // Duration in seconds

    const summary = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds: duration,
      operations: {
        draft: draftCleanup,
        rejected: rejectedCleanup,
        completed: completedArchive
      },
      totalDeleted: draftCleanup.deletedCount + rejectedCleanup.deletedCount,
      totalArchived: completedArchive.archivedCount,
      totalErrors: draftCleanup.errors.length + rejectedCleanup.errors.length + completedArchive.errors.length
    };

    console.log('\n[File Cleanup] Cleanup operations completed');
    console.log(`[File Cleanup] Total deleted: ${summary.totalDeleted}`);
    console.log(`[File Cleanup] Total archived: ${summary.totalArchived}`);
    console.log(`[File Cleanup] Total errors: ${summary.totalErrors}`);
    console.log(`[File Cleanup] Duration: ${duration.toFixed(2)} seconds`);

    return summary;
  } catch (error) {
    console.error('[File Cleanup] Error in runAllCleanup:', error);
    throw error;
  }
};

module.exports = {
  deleteDraftResultsOlderThan,
  deleteRejectedResultsOlderThan,
  archiveCompletedResults,
  runAllCleanup
};
