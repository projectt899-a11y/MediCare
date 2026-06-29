import React from "react";
import type { PaginationButtonProps } from "../../../utils/paginationUtils.ts";

const PaginationButton: React.FC<PaginationButtonProps> = ({
  page,
  isActive,
  isDisabled,
  onClick,
  ariaLabel,
}) => {
  const isEllipsis = page === "...";

  return (
    <button
      className={`pagination-button ${isActive ? "active" : ""} ${
        isDisabled ? "disabled" : ""
      } ${isEllipsis ? "ellipsis" : ""}`}
      onClick={onClick}
      disabled={isDisabled || isEllipsis}
      aria-label={ariaLabel}
      aria-current={isActive ? "page" : undefined}
      aria-disabled={isDisabled || isEllipsis}
    >
      {page}
    </button>
  );
};

export default PaginationButton;
