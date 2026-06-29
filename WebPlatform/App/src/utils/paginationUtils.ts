/**
 * Pagination Utilities
 * Helper functions for pagination calculations and logic
 */

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export interface PaginationButtonProps {
  page: number | string;
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}

/**
 * Calculate total number of pages
 * @param total - Total number of records
 * @param limit - Records per page
 * @returns Total number of pages
 */
export const calculateTotalPages = (total: number, limit: number): number => {
  return Math.ceil(total / limit);
};

/**
 * Check if a page number is valid
 * @param page - Page number to validate
 * @param totalPages - Total number of pages
 * @returns True if page is valid
 */
export const isPageValid = (page: number, totalPages: number): boolean => {
  return page >= 1 && page <= totalPages;
};

/**
 * Get visible page numbers for pagination controls
 * Shows all pages if <= 5, otherwise shows first, last, current ± 1 with ellipsis
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @returns Array of page numbers and ellipsis strings
 */
export const getVisiblePageNumbers = (
  currentPage: number,
  totalPages: number
): (number | string)[] => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    pages.push("...");
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < totalPages - 1) {
    pages.push("...");
  }

  pages.push(totalPages);

  return pages;
};

/**
 * Format page info display text
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param totalRecords - Total number of records
 * @returns Formatted string like "Page 1 of 5 (50 total)"
 */
export const formatPageInfo = (
  currentPage: number,
  totalPages: number,
  totalRecords: number
): string => {
  return `Page ${currentPage} of ${totalPages} (${totalRecords} total)`;
};
