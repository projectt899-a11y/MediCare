/**
 * Lab Service Tests
 * Tests for lab approval service methods
 */

const labService = require('./labService');
const { createClient } = require('@supabase/supabase-js');

// Mock Supabase
jest.mock('@supabase/supabase-js');

describe('Lab Service - Approval Methods', () => {
  let mockSupabase;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn()
    };

    createClient.mockReturnValue(mockSupabase);
    jest.clearAllMocks();
  });

  describe('approveLab', () => {
    it('should approve a lab successfully', async () => {
      const labId = 'lab-123';
      const adminId = 'admin-456';
      const mockLab = {
        id: labId,
        name: 'Test Lab',
        status: 'Approved',
        email: 'lab@test.com'
      };

      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: labId, status: 'Pending Approval', name: 'Test Lab', email: 'lab@test.com' },
          error: null
        })
      };

      const mockUpdateChain = {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockLab,
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockSelectChain)
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain)
        });

      const result = await labService.approveLab(labId, adminId);

      expect(result.lab).toEqual(mockLab);
      expect(result.changes.status.old).toBe('Pending Approval');
      expect(result.changes.status.new).toBe('Approved');
    });

    it('should throw error if lab not found', async () => {
      const labId = 'lab-123';
      const adminId = 'admin-456';

      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelectChain)
      });

      await expect(labService.approveLab(labId, adminId)).rejects.toThrow('Lab not found');
    });

    it('should throw error if lab is not in Pending Approval status', async () => {
      const labId = 'lab-123';
      const adminId = 'admin-456';

      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: labId, status: 'Approved', name: 'Test Lab', email: 'lab@test.com' },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelectChain)
      });

      await expect(labService.approveLab(labId, adminId)).rejects.toThrow(
        'Cannot approve lab with status: Approved'
      );
    });

    it('should throw error if labId or adminId is missing', async () => {
      await expect(labService.approveLab(null, 'admin-456')).rejects.toThrow(
        'Missing required fields: labId, adminId'
      );

      await expect(labService.approveLab('lab-123', null)).rejects.toThrow(
        'Missing required fields: labId, adminId'
      );
    });
  });

  describe('rejectLab', () => {
    it('should reject a lab successfully', async () => {
      const labId = 'lab-123';
      const adminId = 'admin-456';
      const reason = 'License verification failed';
      const mockLab = {
        id: labId,
        name: 'Test Lab',
        status: 'Rejected',
        email: 'lab@test.com'
      };

      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: labId, status: 'Pending Approval', name: 'Test Lab', email: 'lab@test.com' },
          error: null
        })
      };

      const mockUpdateChain = {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockLab,
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockSelectChain)
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain)
        });

      const result = await labService.rejectLab(labId, reason, adminId);

      expect(result.lab).toEqual(mockLab);
      expect(result.reason).toBe(reason);
      expect(result.changes.status.old).toBe('Pending Approval');
      expect(result.changes.status.new).toBe('Rejected');
    });

    it('should throw error if rejection reason is empty', async () => {
      const labId = 'lab-123';
      const adminId = 'admin-456';

      await expect(labService.rejectLab(labId, '', adminId)).rejects.toThrow(
        'Rejection reason cannot be empty'
      );

      await expect(labService.rejectLab(labId, '   ', adminId)).rejects.toThrow(
        'Rejection reason cannot be empty'
      );
    });

    it('should throw error if lab not found', async () => {
      const labId = 'lab-123';
      const adminId = 'admin-456';
      const reason = 'License verification failed';

      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelectChain)
      });

      await expect(labService.rejectLab(labId, reason, adminId)).rejects.toThrow('Lab not found');
    });

    it('should throw error if lab is not in Pending Approval status', async () => {
      const labId = 'lab-123';
      const adminId = 'admin-456';
      const reason = 'License verification failed';

      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: labId, status: 'Approved', name: 'Test Lab', email: 'lab@test.com' },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelectChain)
      });

      await expect(labService.rejectLab(labId, reason, adminId)).rejects.toThrow(
        'Cannot reject lab with status: Approved'
      );
    });
  });

  describe('deactivateLab', () => {
    it('should deactivate a lab successfully', async () => {
      const labId = 'lab-123';
      const adminId = 'admin-456';
      const mockLab = {
        id: labId,
        name: 'Test Lab',
        status: 'Inactive',
        email: 'lab@test.com'
      };

      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: labId, status: 'Approved', name: 'Test Lab', email: 'lab@test.com' },
          error: null
        })
      };

      const mockUpdateChain = {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockLab,
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockSelectChain)
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain)
        });

      const result = await labService.deactivateLab(labId, adminId);

      expect(result.lab).toEqual(mockLab);
      expect(result.changes.status.old).toBe('Approved');
      expect(result.changes.status.new).toBe('Inactive');
    });

    it('should throw error if lab is already inactive', async () => {
      const labId = 'lab-123';
      const adminId = 'admin-456';

      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: labId, status: 'Inactive', name: 'Test Lab', email: 'lab@test.com' },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelectChain)
      });

      await expect(labService.deactivateLab(labId, adminId)).rejects.toThrow(
        'Lab is already inactive'
      );
    });

    it('should throw error if lab not found', async () => {
      const labId = 'lab-123';
      const adminId = 'admin-456';

      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockSelectChain)
      });

      await expect(labService.deactivateLab(labId, adminId)).rejects.toThrow('Lab not found');
    });

    it('should throw error if labId or adminId is missing', async () => {
      await expect(labService.deactivateLab(null, 'admin-456')).rejects.toThrow(
        'Missing required fields: labId, adminId'
      );

      await expect(labService.deactivateLab('lab-123', null)).rejects.toThrow(
        'Missing required fields: labId, adminId'
      );
    });
  });
});
