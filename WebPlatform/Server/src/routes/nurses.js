/**
 * Nurse Routes
 * Handles all nurse-related endpoints with proper route ordering
 * 
 * Route Ordering:
 * 1. FEATURE 1: FOLLOW-UP TEMPLATES (POST, GET, GET/:templateId)
 * 2. FEATURE 2: BULK EXPORT (POST /bulk-export)
 * 3. FEATURE 3: EMAIL NOTIFICATIONS (POST /send-report)
 * 4. FEATURE 4: ARCHIVE FOLLOW-UPS (PUT /archive, GET /archived)
 * 5. FEATURE 5: PATIENT RESPONSE NOTIFICATIONS (GET, PATCH, DELETE)
 * 6. NURSE DASHBOARD ROUTES (GET /:nurseId/dashboard/stats, GET /:nurseId/recent-activities)
 * 7. NURSE FOLLOW-UP CREATION ROUTES (POST, GET, PUT)
 * 8. NURSE MANAGEMENT ROUTES (POST /, GET /)
 * 9. NURSE-PATIENT ASSIGNMENT ROUTES (POST /assignments, GET /assignments, PUT /assignments/:id)
 * 10. GET /:nurseId/patients
 * 11. GET /patients/:patientId/nurses
 * 12. INDIVIDUAL NURSE ROUTES (PUT /:id/status, GET /:id, PUT /:id)
 * 13. REPORT EXPORT ROUTES (GET /follow-up-requests/:requestId/report)
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/authMiddleware');
const { adminAuthMiddleware } = require('../middleware/adminAuth');
const nurseController = require('../controllers/nurseController');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Middleware: Authenticate Nurse
 * Verifies that the user is a nurse
 */
const authenticateNurse = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided'
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Check if user is a nurse
    if (user.user_metadata?.role !== 'nurse') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only nurses can access this endpoint'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role
    };

    next();
  } catch (error) {
    console.error('❌ Nurse auth middleware error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during authentication'
    });
  }
};

// ============================================================================
// NURSE PROFILE ENDPOINTS
// ============================================================================

/**
 * GET /api/nurses/profile
 * Get current nurse's profile information
 */
router.get('/profile', authenticateNurse, async (req, res) => {
  try {
    const nurseId = req.user.id;

    // Try to get from nurses table first
    const { data: nurse, error: nurseError } = await supabase
      .from('nurses')
      .select('*')
      .eq('user_id', nurseId)
      .single();

    if (nurse && !nurseError) {
      return res.json(nurse);
    }

    // If not found in nurses table, get from auth user metadata
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(nurseId);

    if (authError || !user) {
      return res.status(404).json({ error: 'Nurse profile not found' });
    }

    // Return profile data from auth user metadata
    res.json({
      user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      phone_number: user.user_metadata?.phone_number || '',
      gender: user.user_metadata?.gender || '',
      license_number: user.user_metadata?.license_number || '',
      years_of_experience: user.user_metadata?.years_of_experience || '',
      certification: user.user_metadata?.certification || '',
      biography: user.user_metadata?.biography || '',
      profile_picture: user.user_metadata?.profile_picture || null,
      is_approved: user.user_metadata?.is_approved || false,
      admin_approval_date: user.user_metadata?.admin_approval_date || null,
      approved_by: user.user_metadata?.approved_by || null,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PUT /api/nurses/profile
 * Update nurse's profile information
 */
router.put('/profile', authenticateNurse, async (req, res) => {
  try {
    const nurseId = req.user.id;
    const { fullName, phone, gender, licenseNumber, yearsOfExperience, certification, biography } = req.body;

    // Update auth user metadata
    const { error: authError } = await supabase.auth.admin.updateUserById(nurseId, {
      user_metadata: {
        full_name: fullName,
        phone_number: phone,
        gender,
        license_number: licenseNumber,
        years_of_experience: yearsOfExperience,
        certification,
        biography
      }
    });

    if (authError) {
      console.error('Auth update error:', authError);
      return res.status(400).json({ error: 'Failed to update profile' });
    }

    // Try to update nurses table if it exists
    try {
      await supabase
        .from('nurses')
        .update({
          full_name: fullName,
          phone_number: phone,
          gender,
          license_number: licenseNumber,
          years_of_experience: yearsOfExperience,
          certification,
          biography
        })
        .eq('user_id', nurseId);
    } catch (tableError) {
      // If nurses table doesn't have this record, just continue with auth metadata
      console.log('Nurses table update skipped:', tableError);
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * POST /api/nurses/change-password
 * Change nurse's password
 */
router.post('/change-password', authenticateNurse, async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword || newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const { error } = await supabase.auth.admin.updateUserById(req.user.id, {
      password: newPassword
    });

    if (error) {
      console.error('Password change error:', error);
      return res.status(400).json({ error: 'Failed to change password' });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============================================================================
// FEATURE 1: FOLLOW-UP TEMPLATES
// ============================================================================

// ============================================================================
// FEATURE 2: BULK EXPORT
// ============================================================================

/**
 * POST /api/nurses/bulk-export
 * Export multiple follow-up requests
 */
router.post('/bulk-export', authenticateNurse, async (req, res) => {
  try {
    const { follow_up_ids } = req.body;
    const nurseId = req.user.id;

    if (!follow_up_ids || !Array.isArray(follow_up_ids) || follow_up_ids.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        details: 'follow_up_ids array is required'
      });
    }

    // Update export metadata for each follow-up
    const { data: updated, error } = await supabase
      .from('follow_up_requests')
      .update({
        exported_at: new Date().toISOString(),
        export_count: supabase.rpc('increment_export_count')
      })
      .in('id', follow_up_ids)
      .eq('created_by_nurse_id', nurseId)
      .select();

    if (error) {
      console.error('❌ Bulk export error:', error);
      return res.status(400).json({
        error: 'Failed to export follow-ups',
        details: error.message
      });
    }

    res.json({
      success: true,
      data: {
        exported_count: updated?.length || 0,
        exported_at: new Date().toISOString()
      },
      message: 'Follow-ups exported successfully'
    });
  } catch (error) {
    console.error('❌ Error exporting follow-ups:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// FEATURE 3: EMAIL NOTIFICATIONS
// ============================================================================
// (Email notification routes handled in FOLLOW-UP REQUEST ROUTES section)

// ============================================================================
// FEATURE 4: ARCHIVE FOLLOW-UPS
// ============================================================================
// (Archive routes handled in FOLLOW-UP REQUEST ROUTES section)

// ============================================================================
// NURSE DASHBOARD ROUTES
// ============================================================================

/**
 * GET /api/nurses/:nurseId/dashboard/stats
 * Get nurse dashboard statistics
 */
router.get('/:nurseId/dashboard/stats', authenticateNurse, async (req, res) => {
  try {
    const { nurseId } = req.params;
    const userId = req.user.id;

    // Verify the nurse is accessing their own dashboard
    if (nurseId !== userId) {
      return res.status(403).json({ error: 'Access denied: Cannot access other nurse dashboards' });
    }

    // Get total patients assigned to this nurse
    const { data: patients, error: patientsError } = await supabase
      .from('nurse_patient_assignments')
      .select('patient_id')
      .eq('nurse_id', nurseId)
      .eq('status', 'active');

    if (patientsError) throw patientsError;

    const totalPatients = patients?.length || 0;

    // Get follow-up requests statistics
    const { data: followUps, error: followUpsError } = await supabase
      .from('follow_up_requests')
      .select('id, status, created_at')
      .in('patient_id', patients?.map(p => p.patient_id) || []);

    if (followUpsError) throw followUpsError;

    // Calculate statistics
    const completedFollowUps = followUps?.filter(f => f.status === 'completed').length || 0;

    res.json({
      data: {
        total_patients: totalPatients,
        completed_follow_ups: completedFollowUps
      }
    });
  } catch (error) {
    console.error('❌ Dashboard stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

/**
 * GET /api/nurses/:nurseId/recent-activities
 * Get recent activities for nurse (today only)
 */
router.get('/:nurseId/recent-activities', authenticateNurse, async (req, res) => {
  try {
    const { nurseId } = req.params;
    const userId = req.user.id;

    // Verify the nurse is accessing their own activities
    if (nurseId !== userId) {
      return res.status(403).json({ error: 'Access denied: Cannot access other nurse activities' });
    }

    // Get today's date range in UTC
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    
    const todayDateStr = `${year}-${month}-${day}`;
    const todayStart = new Date(`${todayDateStr}T00:00:00Z`);
    const todayEnd = new Date(`${todayDateStr}T23:59:59Z`);

    // Get recent follow-up requests created for this nurse's patients (today only)
    const { data: patients, error: patientsError } = await supabase
      .from('nurse_patient_assignments')
      .select('patient_id')
      .eq('nurse_id', nurseId)
      .eq('status', 'active');

    if (patientsError) throw patientsError;

    const { data: activities, error: activitiesError } = await supabase
      .from('follow_up_requests')
      .select('id, created_at, status')
      .in('patient_id', patients?.map(p => p.patient_id) || [])
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (activitiesError) throw activitiesError;

    // Format activities
    const formattedActivities = activities?.map(activity => ({
      id: activity.id,
      type: 'follow_up_created',
      description: `Follow-up request created`,
      timestamp: activity.created_at
    })) || [];

    res.json({ data: formattedActivities });
  } catch (error) {
    console.error('❌ Recent activities error:', error.message);
    res.status(500).json({ error: 'Failed to fetch recent activities' });
  }
});

// ============================================================================
// FEATURE 5: PATIENT RESPONSE NOTIFICATIONS
// ============================================================================

/**
 * GET /api/nurses/notifications
 * Get all unread notifications for the nurse
 */
router.get('/notifications', authenticateNurse, async (req, res) => {
  try {
    const nurseId = req.user.id;

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, type, message, is_read, created_at')
      .eq('user_id', nurseId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        error: 'Failed to fetch notifications',
        details: error.message
      });
    }

    const unreadCount = (notifications || []).filter(n => !n.is_read).length;

    res.json({
      data: notifications || [],
      unread_count: unreadCount,
      message: 'Notifications retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PATCH /api/nurses/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/notifications/read-all', authenticateNurse, async (req, res) => {
  try {
    const nurseId = req.user.id;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', nurseId)
      .eq('is_read', false);

    if (error) {
      return res.status(400).json({ error: 'Failed to mark notifications as read', details: error.message });
    }

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/nurses/notifications/:notificationId
 * Mark a notification as read
 */
router.patch('/notifications/:notificationId', authenticateNurse, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const nurseId = req.user.id;

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({
        is_read: true
      })
      .eq('id', notificationId)
      .eq('user_id', nurseId)
      .select()
      .single();

    if (error || !notification) {
      return res.status(404).json({
        error: 'Notification not found or unauthorized'
      });
    }

    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('❌ Error updating notification:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/nurses/notifications/:notificationId
 * Delete a notification
 */
router.delete('/notifications/:notificationId', authenticateNurse, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const nurseId = req.user.id;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', nurseId);

    if (error) {
      console.error('❌ Error deleting notification:', error);
      return res.status(400).json({
        error: 'Failed to delete notification',
        details: error.message
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting notification:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// FOLLOW-UP REQUEST ROUTES - SPECIFIC ROUTES FIRST (BEFORE GENERIC)
// ============================================================================

/**
 * POST /api/nurses/follow-up-requests/:requestId/send-report
 * Send follow-up report via email
 */
router.post('/follow-up-requests/:requestId/send-report', authenticateNurse, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { recipient_email, recipient_type } = req.body;
    const nurseId = req.user.id;

    if (!recipient_email || !recipient_type) {
      return res.status(400).json({
        error: 'Invalid input',
        details: 'recipient_email and recipient_type are required'
      });
    }

    // Verify follow-up exists and belongs to this nurse
    const { data: followUp, error: followUpError } = await supabase
      .from('follow_up_requests')
      .select('*')
      .eq('id', requestId)
      .eq('created_by_nurse_id', nurseId)
      .single();

    if (followUpError || !followUp) {
      return res.status(404).json({
        error: 'Follow-up request not found or unauthorized'
      });
    }

    // Log notification
    const { data: notification, error: notificationError } = await supabase
      .from('follow_up_notifications')
      .insert([{
        follow_up_request_id: requestId,
        recipient_email,
        recipient_type,
        notification_type: 'report_sent',
        sent_at: new Date().toISOString(),
        status: 'sent'
      }])
      .select()
      .single();

    if (notificationError) {
      console.error('❌ Notification logging error:', notificationError);
      return res.status(400).json({
        error: 'Failed to send report',
        details: notificationError.message
      });
    }

    res.json({
      success: true,
      data: notification,
      message: 'Report sent successfully'
    });
  } catch (error) {
    console.error('❌ Error sending report:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/nurses/follow-up-requests/:requestId/archive
 * Archive a follow-up request
 */
router.put('/follow-up-requests/:requestId/archive', authenticateNurse, async (req, res) => {
  try {
    const { requestId } = req.params;
    const nurseId = req.user.id;

    // Verify follow-up exists and belongs to this nurse
    const { data: followUp, error: followUpError } = await supabase
      .from('follow_up_requests')
      .select('*')
      .eq('id', requestId)
      .eq('created_by_nurse_id', nurseId)
      .single();

    if (followUpError || !followUp) {
      return res.status(404).json({
        error: 'Follow-up request not found or unauthorized'
      });
    }

    // Archive the follow-up
    const { data: archived, error } = await supabase
      .from('follow_up_requests')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('❌ Archive error:', error);
      return res.status(400).json({
        error: 'Failed to archive follow-up',
        details: error.message
      });
    }

    res.json({
      success: true,
      data: archived,
      message: 'Follow-up archived successfully'
    });
  } catch (error) {
    console.error('❌ Error archiving follow-up:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/nurses/follow-up-requests/archived
 * Get all archived follow-up requests for the nurse
 */
router.get('/follow-up-requests/archived', authenticateNurse, async (req, res) => {
  try {
    const nurseId = req.user.id;

    const { data: archived, error } = await supabase
      .from('follow_up_requests')
      .select('*')
      .eq('created_by_nurse_id', nurseId)
      .eq('is_archived', true)
      .order('archived_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching archived follow-ups:', error);
      return res.status(400).json({
        error: 'Failed to fetch archived follow-ups',
        details: error.message
      });
    }

    res.json({
      data: archived || [],
      message: 'Archived follow-ups retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching archived follow-ups:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/nurses/follow-up-requests/:requestId/report
 * Export follow-up request as report (PDF)
 */
router.get('/follow-up-requests/:requestId/report', authenticateNurse, async (req, res) => {
  try {
    const { requestId } = req.params;
    const nurseId = req.user.id;

    // Verify follow-up exists and belongs to this nurse
    const { data: followUp, error: followUpError } = await supabase
      .from('follow_up_requests')
      .select('*')
      .eq('id', requestId)
      .eq('created_by_nurse_id', nurseId)
      .single();

    if (followUpError || !followUp) {
      return res.status(404).json({
        error: 'Follow-up request not found or unauthorized'
      });
    }

    // Get questions
    const { data: questions, error: questionsError } = await supabase
      .from('follow_up_questions')
      .select('id, request_id, question, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (questionsError) {
      console.error('❌ Error fetching questions:', questionsError);
      return res.status(400).json({
        error: 'Failed to fetch report data',
        details: questionsError.message
      });
    }

    // Get answers
    const questionIds = (questions || []).map(q => q.id);
    let answers = [];
    if (questionIds.length > 0) {
      const { data: answersData } = await supabase
        .from('follow_up_answers')
        .select('id, question_id, patient_id, answer, created_at')
        .in('question_id', questionIds);
      answers = answersData || [];
    }

    // Generate HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Follow-up Report</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 20px; }
          h1 { color: #007bff; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
          h2 { color: #0056b3; margin-top: 20px; }
          .section { margin-bottom: 20px; }
          .info-row { margin-bottom: 8px; }
          .label { font-weight: bold; color: #555; }
          .question { background: #f8f9fa; padding: 10px; margin-bottom: 10px; border-left: 4px solid #007bff; }
          .answer { background: #e8f4f8; padding: 10px; margin-left: 20px; margin-bottom: 10px; border-left: 4px solid #17a2b8; }
          .no-answer { color: #999; font-style: italic; }
          .timestamp { color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Follow-up Request Report</h1>
        
        <div class="section">
          <h2>Request Information</h2>
          <div class="info-row"><span class="label">Request ID:</span> ${followUp.id}</div>
          <div class="info-row"><span class="label">Created:</span> ${new Date(followUp.created_at).toLocaleString()}</div>
          ${followUp.deadline ? `<div class="info-row"><span class="label">Deadline:</span> ${new Date(followUp.deadline).toLocaleString()}</div>` : ''}
          <div class="info-row"><span class="label">Status:</span> ${followUp.status || 'N/A'}</div>
        </div>

        <div class="section">
          <h2>Questions & Responses</h2>
          ${(questions || []).map((question, index) => {
            const answer = answers.find(a => a.question_id === question.id);
            return `
              <div class="question">
                <strong>Q${index + 1}: ${question.question || question.question_text}</strong>
                ${answer ? `
                  <div class="answer">
                    <strong>Answer:</strong> ${answer.answer || answer.answer_text}
                    <div class="timestamp">Answered: ${new Date(answer.created_at).toLocaleString()}</div>
                  </div>
                ` : `
                  <div class="no-answer">No answer provided yet</div>
                `}
              </div>
            `;
          }).join('')}
        </div>

        ${followUp.nurse_notes ? `
          <div class="section">
            <h2>Nurse Notes</h2>
            <div>${followUp.nurse_notes}</div>
          </div>
        ` : ''}

        <div style="margin-top: 40px; text-align: center; color: #999; font-size: 12px;">
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="follow-up-report-${followUp.id}-${new Date().toISOString().split('T')[0]}.pdf"`);

    // For now, send as HTML that can be printed to PDF
    // In production, you might want to use a library like 'pdfkit' or 'puppeteer' to generate actual PDF
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (error) {
    console.error('❌ Error generating report:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/nurses/follow-up-requests/:requestId
 * Update follow-up request notes
 */
router.put('/follow-up-requests/:requestId', authenticateNurse, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { nurse_notes } = req.body;
    const nurseId = req.user.id;

    // Verify follow-up exists and belongs to this nurse
    const { data: followUp, error: followUpError } = await supabase
      .from('follow_up_requests')
      .select('*')
      .eq('id', requestId)
      .eq('created_by_nurse_id', nurseId)
      .single();

    if (followUpError || !followUp) {
      return res.status(404).json({
        error: 'Follow-up request not found or unauthorized'
      });
    }

    // Update notes
    const { data: updated, error } = await supabase
      .from('follow_up_requests')
      .update({
        nurse_notes
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('❌ Update error:', error);
      return res.status(400).json({
        error: 'Failed to update follow-up',
        details: error.message
      });
    }

    res.json({
      success: true,
      data: updated,
      message: 'Follow-up updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating follow-up:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/nurses/follow-up-requests
 * Create a new follow-up request
 */
router.post('/follow-up-requests', authenticateNurse, async (req, res) => {
  try {
    const { patient_id, title, questions, nurse_notes } = req.body;
    const nurseId = req.user.id;

    // Validate input
    if (!patient_id) {
      return res.status(400).json({
        error: 'Invalid input',
        details: 'patient_id is required'
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        error: 'Invalid input',
        details: 'title is required'
      });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        details: 'questions array is required and must contain at least one question'
      });
    }

    // Validate each question has text
    const invalidQuestions = questions.filter(q => !q.question_text || !q.question_text.trim());
    if (invalidQuestions.length > 0) {
      return res.status(400).json({
        error: 'Invalid input',
        details: 'All questions must have non-empty text'
      });
    }

    // Verify patient is assigned to this nurse and get doctor_id
    const { data: assignment, error: assignmentError } = await supabase
      .from('nurse_patient_assignments')
      .select('assigned_by_doctor_id')
      .eq('nurse_id', nurseId)
      .eq('patient_id', patient_id)
      .eq('status', 'active')
      .single();

    if (assignmentError || !assignment) {
      return res.status(403).json({
        error: 'Patient not assigned to this nurse'
      });
    }

    // Get doctor_id from assignment
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('doctor_id')
      .eq('user_id', patient_id)
      .single();

    // If patient not found or no doctor assigned, use null for doctor_id
    const doctorId = patient?.doctor_id || assignment.assigned_by_doctor_id || null;

    // Create follow-up request with doctor_id from patient (or null if not found)
    const { data: followUp, error: followUpError } = await supabase
      .from('follow_up_requests')
      .insert([{
        patient_id,
        doctor_id: doctorId,
        title: req.body.title,
        created_by_nurse_id: nurseId,
        nurse_notes: nurse_notes || null,
        status: 'pending',
        created_by_type: 'nurse',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (followUpError) {
      console.error('❌ Follow-up creation error:', followUpError);
      return res.status(400).json({
        error: 'Failed to create follow-up',
        details: followUpError.message
      });
    }

    // Create questions
    const questionRecords = questions.map((q, index) => ({
      request_id: followUp.id,
      question: q.question_text.trim(),
      created_at: new Date().toISOString()
    }));

    const { data: createdQuestions, error: questionsError } = await supabase
      .from('follow_up_questions')
      .insert(questionRecords)
      .select();

    if (questionsError) {
      console.error('❌ Questions creation error:', questionsError);
      return res.status(400).json({
        error: 'Failed to create questions',
        details: questionsError.message
      });
    }

    res.status(201).json({
      success: true,
      data: {
        ...followUp,
        questions: createdQuestions
      },
      message: 'Follow-up request created successfully'
    });

    // Notify the patient about the new follow-up request
    await supabase.from('notifications').insert({
      user_id: patient_id,
      type: 'new_follow_up',
      message: `You have a new follow-up request: "${req.body.title}" with ${createdQuestions.length} question${createdQuestions.length !== 1 ? 's' : ''}`
    });
  } catch (error) {
    console.error('❌ Error creating follow-up:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/nurses/follow-up-requests/:requestId
 * Get a single follow-up request with its questions and patient answers
 */
router.get('/follow-up-requests/:requestId', authenticateNurse, async (req, res) => {
  try {
    const { requestId } = req.params;
    const nurseId = req.user.id;

    // Get the request and verify it belongs to this nurse
    const { data: followUp, error: followUpError } = await supabase
      .from('follow_up_requests')
      .select('*')
      .eq('id', requestId)
      .eq('created_by_nurse_id', nurseId)
      .single();

    if (followUpError || !followUp) {
      return res.status(404).json({ error: 'Follow-up request not found' });
    }

    // Get questions
    const { data: questions, error: questionsError } = await supabase
      .from('follow_up_questions')
      .select('id, request_id, question, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (questionsError) {
      return res.status(500).json({ error: 'Failed to fetch questions', details: questionsError.message });
    }

    // Get answers for all questions
    const questionIds = (questions || []).map(q => q.id);
    let answers = [];
    if (questionIds.length > 0) {
      const { data: answersData, error: answersError } = await supabase
        .from('follow_up_answers')
        .select('id, question_id, patient_id, answer, created_at')
        .in('question_id', questionIds);

      if (!answersError) {
        answers = answersData || [];
      }
    }

    res.json({
      data: {
        ...followUp,
        questions: questions || [],
        answers
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * GET /api/nurses/follow-up-requests
 * Get all follow-up requests created by the nurse
 */
router.get('/follow-up-requests', authenticateNurse, async (req, res) => {
  try {
    const nurseId = req.user.id;
    const { status, search } = req.query;

    let query = supabase
      .from('follow_up_requests')
      .select('*')
      .eq('created_by_nurse_id', nurseId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: followUps, error } = await query;

    if (error) {
      console.error('❌ Error fetching follow-ups:', error);
      return res.status(400).json({
        error: 'Failed to fetch follow-ups',
        details: error.message
      });
    }

    // Get patient names for each follow-up
    const enrichedFollowUps = await Promise.all(
      (followUps || []).map(async (fu) => {
        try {
          const { data: patient } = await supabase
            .from('patients')
            .select('full_name')
            .eq('user_id', fu.patient_id)
            .single();

          return {
            ...fu,
            patient_name: patient?.full_name || 'Unknown'
          };
        } catch (err) {
          return {
            ...fu,
            patient_name: 'Unknown'
          };
        }
      })
    );

    // Apply search filter if provided
    let filtered = enrichedFollowUps;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(fu => 
        fu.patient_name.toLowerCase().includes(searchLower) ||
        (fu.nurse_notes && fu.nurse_notes.toLowerCase().includes(searchLower))
      );
    }

    res.json({
      data: {
        requests: filtered
      },
      message: 'Follow-up requests retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching follow-ups:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// NURSE MANAGEMENT ROUTES
// ============================================================================

/**
 * POST /api/nurses
 * Create a new nurse (Admin only)
 */
router.post('/', adminAuthMiddleware, nurseController.createNurse);

/**
 * GET /api/nurses
 * Get all nurses with filtering and pagination
 */
router.get('/', adminAuthMiddleware, nurseController.getAllNurses);

/**
 * PUT /api/nurses/:id/status
 * Update nurse account status (Admin only)
 */
router.put('/:id/status', adminAuthMiddleware, nurseController.updateNurseStatus);

/**
 * GET /api/nurses/:id
 * Get a specific nurse by ID
 */
router.get('/:id', adminAuthMiddleware, nurseController.getNurseById);

/**
 * PUT /api/nurses/:id
 * Update nurse profile (Admin only)
 */
router.put('/:id', adminAuthMiddleware, nurseController.updateNurse);

// ============================================================================
// NURSE-PATIENT ASSIGNMENT ROUTES
// ============================================================================

/**
 * POST /api/nurses/assignments
 * Create a nurse-patient assignment
 */
router.post('/assignments', adminAuthMiddleware, nurseController.createAssignment);

/**
 * GET /api/nurses/assignments
 * Get assignments with filtering
 */
router.get('/assignments', adminAuthMiddleware, nurseController.getAssignments);

/**
 * PUT /api/nurses/assignments/:id
 * Update assignment status
 */
router.put('/assignments/:id', adminAuthMiddleware, nurseController.updateAssignmentStatus);

// ============================================================================
// NURSE-PATIENT RELATIONSHIP ROUTES
// ============================================================================

/**
 * GET /api/nurses/:nurseId/patients
 * Get all patients assigned to a nurse
 */
router.get('/:nurseId/patients', authenticateNurse, nurseController.getNursePatients);

/**
 * GET /api/nurses/patients/:patientId/nurses
 * Get all nurses assigned to a patient
 */
router.get('/patients/:patientId/nurses', authenticateNurse, nurseController.getPatientNurses);

module.exports = router;
