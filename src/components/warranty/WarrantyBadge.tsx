import React from "react";
import { AppBadge } from "../AppBadge";
import { SparePartCoverageType } from "../../services/job.service";

interface WarrantyBadgeProps {
  status: SparePartCoverageType;
}

/** Small tag for a spare part's warranty coverage — green for WARRANTY (billed ₹0), amber for
 * OUT_OF_WARRANTY (billed quantity × unit price). Part-level only — never conflate with AMC. */
export const WarrantyBadge: React.FC<WarrantyBadgeProps> = ({ status }) => {
  return status === "WARRANTY" ? (
    <AppBadge label="Warranty" variant="success" />
  ) : (
    <AppBadge label="Out of Warranty" variant="warning" />
  );
};

export default WarrantyBadge;
