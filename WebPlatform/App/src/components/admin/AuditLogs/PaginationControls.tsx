import React from "react";
import type { PaginationControlsProps } from "../../../utils/paginationUtils.ts";
import { getVisiblePageNumbers } from "../../../utils/paginationUtils.ts";
import PaginationButton from "./PaginationButton";
import PaginationInfo from "./PaginationInfo";

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  onPageChange,
  isLoading = false,
}) => {
  if (totalPages === 0) {
    return null;
  }

  const visiblePages = getVisiblePageNumbers(currentPage, totalPages);

  const handleFirstPage = () => {
    if (currentPage !== 1) {
      onPageChange(1);
    }
  };

  const handleLastPage = () => {
    if (currentPage !== totalPages) {
      onPageChange(totalPages);
    }
  };

  const handlePageClick = (page: number | string) => {
    if (typeof page === "number" && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <div className="pagination-container">
      <div className="pagination-controls">
        {/* First Page Button */}
        {totalPages > 1 && (
          <PaginationButton
            page="<<"
            isActive={false}
            isDisabled={currentPage === 1 || isLoading}
            onClick={handleFirstPage}
            ariaLabel="First page"
          />
        )}

        {/* Page Number Buttons */}
        {visiblePages.map((page, index) => (
          <PaginationButton
            key={`${page}-${index}`}
            page={page}
            isActive={page === currentPage}
            isDisabled={page === "..." || isLoading}
            onClick={() => handlePageClick(page)}
            ariaLabel={
              page === "..."
                ? "More pages"
                : `Page ${page}`
            }
          />
        ))}

        {/* Last Page Button */}
        {totalPages > 1 && (
          <PaginationButton
            page=">>"
            isActive={false}
            isDisabled={currentPage === totalPages || isLoading}
            onClick={handleLastPage}
            ariaLabel="Last page"
          />
        )}
      </div>

      {/* Page Info */}
      <PaginationInfo
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
      />
    </div>
  );
};

export default PaginationControls;
