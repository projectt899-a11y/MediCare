/**
 * Lab Controller Tests
 * Tests for lab approval endpoints
 */

const labService = require('../services/labService');
const labAuditLogService = require('../services/labAuditLogService');
const labController = require('./labController');

// Mock dependencies
jest.mock('../services/labService');
jest.mock('../services/labAuditLogService');

describe('Lab Controller - Approval Endpoints', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      user: { id: 'admin-user-id' },
      ip: '127.0.0.1',
      get: jest.fn(() => 'Mozilla/5.0')
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('approveLab', () => {
    it('should approve a lab successfully', async () => {
      const labId = 'lab-123';
      const mockLab = {
        id: labId,
        name: 'Test Lab',
        status: 'Approved',
        email: 'lab@test.com'
      };

      req.params = { id: labId };

      labService.approveLab.mockResolvedValue({
        lab: mockLab,
        changes: {
          status: { old: 'Pending Approval', new: 'Approved' }
        }
      });

      labAuditLogService.logAction.mockResolvedValue({});

      await labController.approveLab(req, res);

      expect(labService.approveLab).toHaveBeenCalledWith(labId, 'admin-user-id');
      expect(labAuditLogService.logAction).toHaveBeenCalledWith(
        'admin-user-id',
        'APPROVE',
        'Lab',
        labId,
        expect.any(Object),
        '127.0.0.1',
        'Mozilla/5.0'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Lab approved successfully',
        data: mockLab
      });
    });

    it('should return 400 if lab ID is missing', async () => {
      req.params = {};

      await labController.approveLab(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Lab ID is required' }]
      });
    });

    it('should return 404 if lab not found', async () => {
      const labId = 'lab-123';
      req.params = { id: labId };

      labService.approveLab.mockRejectedValue(new Error('Lab not found'));

      await labController.approveLab(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not Found',
        message: 'Lab not found'
      });
    });

    it('should return 400 if lab cannot be approved (invalid status)', async () => {
      const labId = 'lab-123';
      req.params = { id: labId };

      labService.approveLab.mockRejectedValue(
        new Error('Cannot approve lab with status: Approved')
      );

      await labController.approveLab(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid Status Transition',
        message: 'Cannot approve lab with status: Approved'
      });
    });
  });

  describe('rejectLab', () => {
    it('should reject a lab successfully', async () => {
      const labId = 'lab-123';
      const reason = 'License verification failed';
      const mockLab = {
        id: labId,
        name: 'Test Lab',
        status: 'Rejected',
        email: 'lab@test.com'
      };

      req.params = { id: labId };
      req.body = { reason };

      labService.rejectLab.mockResolvedValue({
        lab: mockLab,
        reason,
        changes: {
          status: { old: 'Pending Approval', new: 'Rejected' },
          rejection_reason: reason
        }
      });

      labAuditLogService.logAction.mockResolvedValue({});

      await labController.rejectLab(req, res);

      expect(labService.rejectLab).toHaveBeenCalledWith(labId, reason, 'admin-user-id');
      expect(labAuditLogService.logAction).toHaveBeenCalledWith(
        'admin-user-id',
        'REJECT',
        'Lab',
        labId,
        expect.any(Object),
        '127.0.0.1',
        'Mozilla/5.0'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Lab rejected successfully',
        data: mockLab
      });
    });

    it('should return 400 if rejection reason is missing', async () => {
      const labId = 'lab-123';
      req.params = { id: labId };
      req.body = {};

      await labController.rejectLab(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'reason', message: 'Rejection reason is required and cannot be empty' }]
      });
    });

    it('should return 400 if rejection reason is empty', async () => {
      const labId = 'lab-123';
      req.params = { id: labId };
      req.body = { reason: '   ' };

      await labController.rejectLab(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'reason', message: 'Rejection reason is required and cannot be empty' }]
      });
    });

    it('should return 404 if lab not found', async () => {
      const labId = 'lab-123';
      req.params = { id: labId };
      req.body = { reason: 'License verification failed' };

      labService.rejectLab.mockRejectedValue(new Error('Lab not found'));

      await labController.rejectLab(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not Found',
        message: 'Lab not found'
      });
    });

    it('should return 400 if lab cannot be rejected (invalid status)', async () => {
      const labId = 'lab-123';
      req.params = { id: labId };
      req.body = { reason: 'License verification failed' };

      labService.rejectLab.mockRejectedValue(
        new Error('Cannot reject lab with status: Approved')
      );

      await labController.rejectLab(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid Status Transition',
        message: 'Cannot reject lab with status: Approved'
      });
    });
  });

  describe('deactivateLab', () => {
    it('should deactivate a lab successfully', async () => {
      const labId = 'lab-123';
      const mockLab = {
        id: labId,
        name: 'Test Lab',
        status: 'Inactive',
        email: 'lab@test.com'
      };

      req.params = { id: labId };

      labService.deactivateLab.mockResolvedValue({
        lab: mockLab,
        changes: {
          status: { old: 'Approved', new: 'Inactive' }
        }
      });

      labAuditLogService.logAction.mockResolvedValue({});

      await labController.deactivateLab(req, res);

      expect(labService.deactivateLab).toHaveBeenCalledWith(labId, 'admin-user-id');
      expect(labAuditLogService.logAction).toHaveBeenCalledWith(
        'admin-user-id',
        'DEACTIVATE',
        'Lab',
        labId,
        expect.any(Object),
        '127.0.0.1',
        'Mozilla/5.0'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Lab deactivated successfully',
        data: mockLab
      });
    });

    it('should return 400 if lab ID is missing', async () => {
      req.params = {};

      await labController.deactivateLab(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Lab ID is required' }]
      });
    });

    it('should return 404 if lab not found', async () => {
      const labId = 'lab-123';
      req.params = { id: labId };

      labService.deactivateLab.mockRejectedValue(new Error('Lab not found'));

      await labController.deactivateLab(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not Found',
        message: 'Lab not found'
      });
    });

    it('should return 400 if lab is already inactive', async () => {
      const labId = 'lab-123';
      req.params = { id: labId };

      labService.deactivateLab.mockRejectedValue(new Error('Lab is already inactive'));

      await labController.deactivateLab(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid Status Transition',
        message: 'Lab is already inactive'
      });
    });
  });
});
