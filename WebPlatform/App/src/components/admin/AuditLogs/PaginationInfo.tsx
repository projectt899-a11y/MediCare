import React from "react";
import { formatPageInfo } from "../../../utils/paginationUtils.ts";

interface PaginationInfoProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
}

const PaginationInfo: React.FC<PaginationInfoProps> = ({
  currentPage,
  totalPages,
  totalRecords,
}) => {
  return (
    <span className="pagination-info">
      {formatPageInfo(currentPage, totalPages, totalRecords)}
    </span>
  );
};

export default PaginationInfo;
