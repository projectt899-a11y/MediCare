/**
 * Lab Result Controller
 * Handles lab result submission, retrieval, and file management
 */

const { createClient } = require('@supabase/supabase-js');
const labResultService = require('../services/labResultService');
const labAuditLogService = require('../services/labAuditLogService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Submit lab result (file upload or manual entry)
 * POST /api/lab-results
 */
const submitLabResult = async (req, res) => {
  try {
    const { requestId, resultType, resultValues, doctorVisibleNotes, internalLabNotes } = req.body;
    // isDraft is always false — draft functionality has been removed
    const isDraft = false;
    const userId = req.user?.id;
    const file = req.file;

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required'
      });
    }

    // Validate request ID
    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'requestId', message: 'Request ID is required' }]
      });
    }

    // Validate result type
    if (!resultType || !['File Upload', 'Manual Entry'].includes(resultType)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'resultType', message: 'Result type must be "File Upload" or "Manual Entry"' }]
      });
    }

    // Get lab staff info to verify they belong to a lab
    const { data: labStaff, error: staffError } = await supabase
      .from('lab_staff')
      .select('id, lab_id, user_id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    let staffUserId;
    let labId;

    if (staffError || !labStaff) {
      // Check if the user is the lab owner
      const { data: lab, error: labOwnerError } = await supabase
        .from('labs')
        .select('id, name')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .single();

      if (labOwnerError || !lab) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only lab staff or lab owners can submit results'
        });
      }

      // Auto-register the lab owner as a staff member so the FK constraint is satisfied
      const { data: newStaff, error: insertError } = await supabase
        .from('lab_staff')
        .upsert({
          lab_id: lab.id,
          user_id: userId,
          full_name: lab.name + ' Owner',
          email: req.user.email,
          role: 'Lab Technician',
          status: 'Active',
          is_deleted: false,
          created_by: userId,
        }, { onConflict: 'user_id' })
        .select('user_id, lab_id')
        .single();

      if (insertError) {
        console.error('Failed to auto-register lab owner as staff:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to verify lab ownership'
        });
      }

      staffUserId = newStaff.user_id;
      labId = newStaff.lab_id;
    } else {
      staffUserId = labStaff.user_id;
      labId = labStaff.lab_id;
    }

    // Get the lab request to verify it exists and belongs to this lab
    const { data: request, error: requestError } = await supabase
      .from('lab_requests')
      .select('id, lab_id, doctor_id, patient_id, test_type_id, status')
      .eq('id', requestId)
      .eq('is_deleted', false)
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab request not found'
      });
    }

    // Verify the request belongs to this lab
    if (request.lab_id !== labId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to submit results for this request'
      });
    }

    // Verify request status is Processing
    if (request.status !== 'Processing') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Can only submit results for requests in Processing status'
      });
    }

    let uploadedFile = null;

    // Handle file upload
    if (resultType === 'File Upload') {
      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: [{ field: 'file', message: 'File is required for file upload results' }]
        });
      }

      try {
        uploadedFile = await labResultService.uploadResultFile(
          file,
          labId,
          requestId
        );
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          error: 'File Upload Error',
          message: uploadError.message
        });
      }
    }

    // Handle manual entry
    if (resultType === 'Manual Entry') {
      if (!resultValues || Object.keys(resultValues).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: [{ field: 'resultValues', message: 'Result values are required for manual entry' }]
        });
      }

      // Get test type to validate custom fields
      const { data: testType, error: testTypeError } = await supabase
        .from('test_types')
        .select('custom_fields')
        .eq('id', request.test_type_id)
        .single();

      if (!testTypeError && testType && testType.custom_fields) {
        // Validate required fields
        const requiredFields = testType.custom_fields.filter(field => field.required);
        for (const field of requiredFields) {
          if (!(field.name in resultValues)) {
            return res.status(400).json({
              success: false,
              error: 'Validation Error',
              details: [{ field: field.name, message: `${field.label} is required` }]
            });
          }
        }
      }
    }

    // Prepare result data
    const resultData = {
      resultType,
      filePath: uploadedFile?.filePath || null,
      fileName: uploadedFile?.fileName || null,
      fileSize: uploadedFile?.fileSize || null,
      resultValues: resultType === 'Manual Entry' ? resultValues : null,
      doctorVisibleNotes: doctorVisibleNotes || null,
      internalLabNotes: internalLabNotes || null,
      submittedBy: staffUserId,
      labId: labId
    };

    // Submit or save draft
    let result;
    if (isDraft) {
      result = await labResultService.saveDraftResult(requestId, resultData);
    } else {
      const { result: submittedResult } = await labResultService.submitLabResult(requestId, resultData);
      result = submittedResult;
    }

    // Create audit log entry
    await labAuditLogService.logAction(
      userId,
      isDraft ? 'UPDATE' : 'CREATE',
      'Lab Result',
      result.id,
      {
        action: isDraft ? 'saved_draft' : 'submitted',
        resultType,
        requestId,
        isDraft
      },
      req.ip,
      req.get('user-agent')
    );

    // Trigger notification to doctor if result is submitted (not draft)
    if (!isDraft) {
      try {
        const { data: doctor, error: doctorError } = await supabase
          .from('doctors')
          .select('user_id, full_name')
          .eq('user_id', request.doctor_id)
          .single();

        if (!doctorError && doctor) {
          try {
            // Get test type name for better notification message
            const { data: testType, error: testTypeError } = await supabase
              .from('test_types')
              .select('name')
              .eq('id', request.test_type_id)
              .single();

            // Get patient name for notification
            const { data: patient, error: patientError } = await supabase
              .from('patients')
              .select('full_name')
              .eq('user_id', request.patient_id)
              .single();

            const testTypeName = testType?.name || 'Lab Test';
            const patientName = patient?.full_name || 'Patient';
            const message = `Lab results ready: ${testTypeName} for ${patientName}`;

            const { data: insertedNotif, error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: doctor.user_id,
                type: 'lab_result_ready',
                message: message,
                is_read: false,
              })
              .select();

            if (notifError) {
              console.error('[submitLabResult] Failed to insert doctor notification:', notifError);
            }
          } catch (notificationError) {
            console.error('[submitLabResult] Error creating doctor notification:', notificationError);
          }
        }
      } catch (notificationError) {
        console.error('[submitLabResult] Error fetching doctor:', notificationError);
      }

      // Trigger notification to patient if result is submitted
      try {
        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .select('user_id, full_name')
          .eq('user_id', request.patient_id)
          .single();

        if (!patientError && patient) {
          try {
            const { data: insertedNotif, error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: patient.user_id,
                type: 'lab_result_ready',
                message: `Your lab results are now available`,
                is_read: false,
              })
              .select();

            if (notifError) {
              console.error('[submitLabResult] Failed to insert patient notification:', notifError);
            }
          } catch (notificationError) {
            console.error('[submitLabResult] Error creating patient notification:', notificationError);
          }
        }
      } catch (notificationError) {
        console.error('[submitLabResult] Error fetching patient:', notificationError);
      }
    }

    res.status(isDraft ? 200 : 201).json({
      success: true,
      message: isDraft ? 'Result saved as draft successfully' : 'Lab result submitted successfully',
      data: {
        id: result.id,
        requestId: result.lab_request_id,
        resultType: result.result_type,
        isDraft: result.is_draft,
        submittedAt: result.submitted_at,
        version: result.version
      }
    });
  } catch (error) {
    console.error('Error in submitLabResult:', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get lab result by ID
 * GET /api/lab-results/:id
 */
const getLabResult = async (req, res) => {
  try {
    const { id: resultId } = req.params;
    const userId = req.user?.id;

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required'
      });
    }

    // Get the result
    const result = await labResultService.getLabResultById(resultId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab result not found'
      });
    }

    // Verify access - user must be lab staff, doctor, or patient
    const { data: labStaff, error: staffError } = await supabase
      .from('lab_staff')
      .select('lab_id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    // Check if user is lab staff for this lab
    if (labStaff && labStaff.lab_id === result.lab_id) {
      // Lab staff can see all fields
      return res.status(200).json({
        success: true,
        data: result
      });
    }

    // Check if user is the doctor who requested this test
    if (doctor) {
      const { data: request, error: requestError } = await supabase
        .from('lab_requests')
        .select('doctor_id')
        .eq('id', result.lab_request_id)
        .single();

      if (!requestError && request && request.doctor_id === userId) {
        // Doctor can see result but not internal notes
        const filteredResult = {
          ...result,
          internal_lab_notes: null // Hide internal notes from doctor
        };
        return res.status(200).json({
          success: true,
          data: filteredResult
        });
      }
    }

    // Check if user is the patient for this test
    if (patient) {
      const { data: request, error: requestError } = await supabase
        .from('lab_requests')
        .select('patient_id')
        .eq('id', result.lab_request_id)
        .single();

      if (!requestError && request && request.patient_id === userId) {
        // Patient can see result but not internal notes
        const filteredResult = {
          ...result,
          internal_lab_notes: null // Hide internal notes from patient
        };
        return res.status(200).json({
          success: true,
          data: filteredResult
        });
      }
    }

    // User does not have access
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'You do not have permission to view this result'
    });
  } catch (error) {
    console.error('Error in getLabResult:', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get lab result by request ID
 * GET /api/lab-results/request/:requestId
 */
const getLabResultByRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id;

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required'
      });
    }

    // Get the result
    const result = await labResultService.getLabResultByRequestId(requestId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab result not found'
      });
    }

    // Verify access - user must be lab staff, doctor, or patient
    const { data: labStaff, error: staffError } = await supabase
      .from('lab_staff')
      .select('lab_id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    // Check if user is lab staff for this lab
    if (labStaff && labStaff.lab_id === result.lab_id) {
      // Lab staff can see all fields
      return res.status(200).json({
        success: true,
        data: result
      });
    }

    // Check if user is the doctor who requested this test
    if (doctor) {
      const { data: request, error: requestError } = await supabase
        .from('lab_requests')
        .select('doctor_id')
        .eq('id', requestId)
        .single();

      if (!requestError && request && request.doctor_id === userId) {
        // Doctor can see result but not internal notes
        const filteredResult = {
          ...result,
          internal_lab_notes: null // Hide internal notes from doctor
        };
        return res.status(200).json({
          success: true,
          data: filteredResult
        });
      }
    }

    // Check if user is the patient for this test
    if (patient) {
      const { data: request, error: requestError } = await supabase
        .from('lab_requests')
        .select('patient_id')
        .eq('id', requestId)
        .single();

      if (!requestError && request && request.patient_id === userId) {
        // Patient can see result but not internal notes
        const filteredResult = {
          ...result,
          internal_lab_notes: null // Hide internal notes from patient
        };
        return res.status(200).json({
          success: true,
          data: filteredResult
        });
      }
    }

    // User does not have access
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'You do not have permission to view this result'
    });
  } catch (error) {
    console.error('Error in getLabResultByRequest:', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Generate signed URL for file download
 * GET /api/lab-results/:id/download
 */
const downloadLabResultFile = async (req, res) => {
  try {
    const { id: resultId } = req.params;
    const userId = req.user?.id;

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required'
      });
    }

    // Get the result
    const result = await labResultService.getLabResultById(resultId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab result not found'
      });
    }

    // Verify file exists
    if (!result.file_path) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'This result does not have a file to download'
      });
    }

    // Verify access - user must be lab staff, doctor, or patient
    const { data: labStaff, error: staffError } = await supabase
      .from('lab_staff')
      .select('lab_id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    let hasAccess = false;

    // Check if user is lab staff for this lab
    if (labStaff && labStaff.lab_id === result.lab_id) {
      hasAccess = true;
    }

    // Check if user is the doctor who requested this test
    if (doctor) {
      const { data: request, error: requestError } = await supabase
        .from('lab_requests')
        .select('doctor_id')
        .eq('id', result.lab_request_id)
        .single();

      if (!requestError && request && request.doctor_id === userId) {
        hasAccess = true;
      }
    }

    // Check if user is the patient for this test
    if (patient) {
      const { data: request, error: requestError } = await supabase
        .from('lab_requests')
        .select('patient_id')
        .eq('id', result.lab_request_id)
        .single();

      if (!requestError && request && request.patient_id === userId) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to download this file'
      });
    }

    // Generate signed URL
    const signedUrl = await labResultService.generateSignedUrl(result.file_path, 86400); // 24 hours

    // Log file download in audit logs
    await labAuditLogService.logAction(
      userId,
      'DOWNLOAD',
      'Lab Result',
      resultId,
      {
        action: 'file_downloaded',
        fileName: result.file_name
      },
      req.ip,
      req.get('user-agent')
    );

    res.status(200).json({
      success: true,
      data: {
        signedUrl,
        fileName: result.file_name,
        expiresIn: 86400 // 24 hours in seconds
      }
    });
  } catch (error) {
    console.error('Error in downloadLabResultFile:', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/labs/doctor/results
 * Get all lab results for the authenticated doctor
 */
const getDoctorLabResults = async (req, res) => {
  try {
    const doctorId = req.user?.id;

    if (!doctorId) return res.status(401).json({ error: 'Unauthorized' });

    // Step 1: Get all lab_request IDs for this doctor (any status)
    const { data: requests, error: reqError } = await supabase
      .from('lab_requests')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('is_deleted', false);

    if (reqError) throw reqError;

    if (!requests || requests.length === 0) {
      return res.json({ success: true, data: { results: [] } });
    }

    const requestIds = requests.map(r => r.id);

    // Step 2: Get ALL results for those request IDs (including drafts for debugging)
    const { data: results, error: resError } = await supabase
      .from('lab_results')
      .select(`
        id,
        lab_request_id,
        result_type,
        file_path,
        file_name,
        result_values,
        doctor_visible_notes,
        submitted_at,
        is_draft,
        lab_requests (
          doctor_id,
          patient_id,
          lab_id,
          test_type_id,
          patients ( full_name ),
          labs ( name ),
          test_types ( name )
        )
      `)
      .in('lab_request_id', requestIds)
      .order('submitted_at', { ascending: false });

    if (resError) throw resError;

    // Filter out drafts for the final response
    const nonDraftResults = (results || []).filter(r => r.is_draft === false);

    const formatted = nonDraftResults.map(r => ({
      id: r.id,
      lab_request_id: r.lab_request_id,
      patient_name: r.lab_requests?.patients?.full_name || 'Unknown',
      test_type: r.lab_requests?.test_types?.name || 'Unknown',
      lab_name: r.lab_requests?.labs?.name || 'Unknown',
      result_type: r.result_type,
      file_path: r.file_path,
      file_name: r.file_name,
      result_values: r.result_values,
      doctor_visible_notes: r.doctor_visible_notes,
      submitted_at: r.submitted_at,
    }));

    res.json({ success: true, data: { results: formatted } });
  } catch (err) {
    console.error('[getDoctorLabResults] ERROR:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch results' });
  }
};

/**
 * GET /api/labs/patient/results
 * Get all completed lab results for the authenticated patient
 */
const getPatientLabResults = async (req, res) => {
  try {
    const patientId = req.user?.id;
    if (!patientId) return res.status(401).json({ error: 'Unauthorized' });

    // Step 1: Get all lab_request IDs for this patient (any status)
    const { data: requests, error: reqError } = await supabase
      .from('lab_requests')
      .select('id')
      .eq('patient_id', patientId)
      .eq('is_deleted', false);

    if (reqError) throw reqError;

    if (!requests || requests.length === 0) {
      return res.json({ success: true, data: { results: [] } });
    }

    const requestIds = requests.map(r => r.id);

    // Step 2: Get all non-draft results for those request IDs
    const { data: results, error: resError } = await supabase
      .from('lab_results')
      .select(`
        id,
        lab_request_id,
        result_type,
        file_path,
        file_name,
        result_values,
        doctor_visible_notes,
        submitted_at,
        lab_requests (
          doctor_id,
          patient_id,
          lab_id,
          test_type_id,
          patients ( full_name ),
          labs ( name ),
          test_types ( name )
        )
      `)
      .in('lab_request_id', requestIds)
      .eq('is_draft', false)
      .order('submitted_at', { ascending: false });

    if (resError) throw resError;

    const formatted = (results || []).map(r => ({
      id: r.id,
      lab_request_id: r.lab_request_id,
      test_type: r.lab_requests?.test_types?.name || 'Unknown',
      lab_name: r.lab_requests?.labs?.name || 'Unknown',
      result_type: r.result_type,
      file_path: r.file_path,
      file_name: r.file_name,
      result_values: r.result_values,
      doctor_visible_notes: r.doctor_visible_notes,
      submitted_at: r.submitted_at,
    }));

    res.json({ success: true, data: { results: formatted } });
  } catch (err) {
    console.error('getPatientLabResults error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch results' });
  }
};

module.exports = {
  submitLabResult,
  getLabResult,
  getLabResultByRequest,
  downloadLabResultFile,
  getDoctorLabResults,
  getPatientLabResults
};
