import { SchemePeriod } from "../models/scheme.Model.js";

/**
 * Format date to dd/mm/yyyy (Indian Standard)
 */
const formatDateIN = (date) => {
  if (!date) return null;

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
};

export const getActiveSchemePeriod = async (schemeId) => {
  const now = new Date();

  const period = await SchemePeriod.findOne({
    schemeId,
    status: "0",
    openDate: { $lte: now },
    closeDate: { $gte: now },
  })
    .sort({ openDate: -1 })
    .lean();

  if (!period) return null;

  // ✅ Convert dates to Indian format before returning
  return {
    ...period,
    openDate: formatDateIN(period.openDate),
    closeDate: formatDateIN(period.closeDate),
  };
};
