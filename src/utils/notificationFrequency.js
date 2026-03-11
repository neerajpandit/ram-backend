import { NotificationQueue } from "../models/notificationQueue.Model.js";

export const canSendAgain = async ({ userId, type, gapDays, maxCount }) => {
  // Count successful sends
  const sentCount = await NotificationQueue.countDocuments({
    userId,
    type,
    status: "success",
  });

  if (sentCount >= maxCount) return false;

  // Last successful send
  const lastSent = await NotificationQueue.findOne({
    userId,
    type,
    status: "success",
  }).sort({ createdAt: -1 });

  if (!lastSent) return true;

  const nextAllowed = new Date(lastSent.createdAt);
  nextAllowed.setDate(nextAllowed.getDate() + gapDays);

  return new Date() >= nextAllowed;
};
