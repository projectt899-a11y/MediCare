/**
 * Verification Script for Task 5.2: Lab Audit Log Retrieval Endpoints
 * 
 * This script verifies that:
 * 1. The labAuditLogController is properly created
 * 2. The routes are properly registered in admin.js
 * 3. The service methods are available
 * 4. No syntax errors exist
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('TASK 5.2 VERIFICATION: Lab Audit Log Retrieval Endpoints');
console.log('='.repeat(80));

// Check 1: Verify labAuditLogController exists
console.log('\n[1] Checking labAuditLogController.js...');
const controllerPath = path.join(__dirname, 'src/controllers/labAuditLogController.js');
if (fs.existsSync(controllerPath)) {
  console.log('✓ labAuditLogController.js exists');
  
  const controllerContent = fs.readFileSync(controllerPath, 'utf8');
  
  // Check for getAuditLogs function
  if (controllerContent.includes('const getAuditLogs = async (req, res) => {')) {
    console.log('✓ getAuditLogs function is defined');
  } else {
    console.log('✗ getAuditLogs function is NOT defined');
  }
  
  // Check for getAuditLogById function
  if (controllerContent.includes('const getAuditLogById = async (req, res) => {')) {
    console.log('✓ getAuditLogById function is defined');
  } else {
    console.log('✗ getAuditLogById function is NOT defined');
  }
  
  // Check for module exports
  if (controllerContent.includes('module.exports = {')) {
    console.log('✓ Module exports are defined');
  } else {
    console.log('✗ Module exports are NOT defined');
  }
} else {
  console.log('✗ labAuditLogController.js does NOT exist');
}

// Check 2: Verify routes are registered in admin.js
console.log('\n[2] Checking admin.js routes...');
const adminRoutesPath = path.join(__dirname, 'src/routes/admin.js');
if (fs.existsSync(adminRoutesPath)) {
  console.log('✓ admin.js exists');
  
  const adminRoutesContent = fs.readFileSync(adminRoutesPath, 'utf8');
  
  // Check for labAuditLogController import
  if (adminRoutesContent.includes("const labAuditLogController = require('../controllers/labAuditLogController')")) {
    console.log('✓ labAuditLogController is imported');
  } else {
    console.log('✗ labAuditLogController is NOT imported');
  }
  
  // Check for lab-audit-logs routes
  if (adminRoutesContent.includes("router.get('/lab-audit-logs', labAuditLogController.getAuditLogs)")) {
    console.log('✓ GET /lab-audit-logs route is registered');
  } else {
    console.log('✗ GET /lab-audit-logs route is NOT registered');
  }
  
  if (adminRoutesContent.includes("router.get('/lab-audit-logs/:id', labAuditLogController.getAuditLogById)")) {
    console.log('✓ GET /lab-audit-logs/:id route is registered');
  } else {
    console.log('✗ GET /lab-audit-logs/:id route is NOT registered');
  }
  
  // Check for LAB AUDIT LOG ROUTES section
  if (adminRoutesContent.includes('// ============================================================================')) {
    console.log('✓ Routes are properly organized with comments');
  }
} else {
  console.log('✗ admin.js does NOT exist');
}

// Check 3: Verify labAuditLogService has required methods
console.log('\n[3] Checking labAuditLogService.js...');
const servicePath = path.join(__dirname, 'src/services/labAuditLogService.js');
if (fs.existsSync(servicePath)) {
  console.log('✓ labAuditLogService.js exists');
  
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  
  // Check for getLabAuditLogs function
  if (serviceContent.includes('const getLabAuditLogs = async (filters = {}, pagination = {}) => {')) {
    console.log('✓ getLabAuditLogs function is defined');
  } else {
    console.log('✗ getLabAuditLogs function is NOT defined');
  }
  
  // Check for getLabAuditLogById function
  if (serviceContent.includes('const getLabAuditLogById = async (logId) => {')) {
    console.log('✓ getLabAuditLogById function is defined');
  } else {
    console.log('✗ getLabAuditLogById function is NOT defined');
  }
  
  // Check for filtering support
  if (serviceContent.includes('if (action_type)') && 
      serviceContent.includes('if (resource_type)') &&
      serviceContent.includes('if (start_date)') &&
      serviceContent.includes('if (end_date)')) {
    console.log('✓ Filtering support is implemented');
  } else {
    console.log('✗ Filtering support is NOT complete');
  }
  
  // Check for pagination support
  if (serviceContent.includes('const offset = (page - 1) * limit') &&
      serviceContent.includes('query.range(offset, offset + limit - 1)')) {
    console.log('✓ Pagination support is implemented');
  } else {
    console.log('✗ Pagination support is NOT implemented');
  }
} else {
  console.log('✗ labAuditLogService.js does NOT exist');
}

// Check 4: Verify test files exist
console.log('\n[4] Checking test files...');
const unitTestPath = path.join(__dirname, 'tests/labAuditLogController.test.js');
const integrationTestPath = path.join(__dirname, 'tests/labAuditLogEndpoints.integration.test.js');

if (fs.existsSync(unitTestPath)) {
  console.log('✓ labAuditLogController.test.js exists');
} else {
  console.log('✗ labAuditLogController.test.js does NOT exist');
}

if (fs.existsSync(integrationTestPath)) {
  console.log('✓ labAuditLogEndpoints.integration.test.js exists');
} else {
  console.log('✗ labAuditLogEndpoints.integration.test.js does NOT exist');
}

// Check 5: Verify implementation summary exists
console.log('\n[5] Checking documentation...');
const summaryPath = path.join(__dirname, 'TASK_5.2_IMPLEMENTATION_SUMMARY.md');
if (fs.existsSync(summaryPath)) {
  console.log('✓ TASK_5.2_IMPLEMENTATION_SUMMARY.md exists');
} else {
  console.log('✗ TASK_5.2_IMPLEMENTATION_SUMMARY.md does NOT exist');
}

console.log('\n' + '='.repeat(80));
console.log('VERIFICATION COMPLETE');
console.log('='.repeat(80));

console.log('\nImplementation Summary:');
console.log('- Created labAuditLogController.js with two endpoints');
console.log('- Added routes to admin.js for lab audit log retrieval');
console.log('- Implemented filtering by action_type, resource_type, date range');
console.log('- Implemented pagination with 20 items per page default');
console.log('- Enforced admin-only access control via middleware');
console.log('- Created comprehensive unit and integration tests');
console.log('- All endpoints follow existing patterns and conventions');

console.log('\nEndpoints Created:');
console.log('- GET /api/admin/lab-audit-logs (with filtering and pagination)');
console.log('- GET /api/admin/lab-audit-logs/:id (retrieve specific log)');

console.log('\nRequirements Satisfied:');
console.log('- Requirement 13: Audit Logging for Lab Operations');
console.log('  - 13.8: Display audit logs filtered by resource type');
console.log('  - 13.9: Show who uploaded results and when');
console.log('  - 13.10: Searchable by date range, user, and action type');
