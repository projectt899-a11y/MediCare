/**
 * Admin Authentication Middleware
 * Verifies that the user is an admin before allowing access to admin routes
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Middleware: Verify Admin Role
 * Checks if the authenticated user has admin role
 */
const adminAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No authentication token provided'
      });
    }

    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Get admin info from admin_users table (SEPARATED from user_roles)
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, full_name, account_status, is_deleted')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminUser) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'User is not an admin'
      });
    }

    // Check if admin account is active
    if (adminUser.account_status !== 'Active' || adminUser.is_deleted) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Your admin account is not active'
      });
    }

    // Attach admin info to request
    req.user = {
      id: user.id,
      email: adminUser.email,
      full_name: adminUser.full_name,
      role: 'Admin',
      account_status: adminUser.account_status
    };

    next();
  } catch (error) {
    console.error('❌ Admin auth middleware error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Middleware: Require Specific Admin Permission
 * Can be extended for granular permission checking
 */
const requireAdminPermission = (permission) => {
  return (req, res, next) => {
    // For now, just check if user is admin
    // Can be extended to check specific permissions
    if (req.user && req.user.role === 'Admin') {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `You do not have permission: ${permission}`
      });
    }
  };
};

module.exports = {
  adminAuthMiddleware,
  requireAdminPermission
};
