import { NotificationQueue } from "../../models/notificationQueue.Model.js";
import FailedNotification from "../../models/failedNotification.Model.js";
import { sendSMS } from "../otpService.js";
import sendMail from "../emailService.js";

export const startNotificationWorker = () => {

  setInterval(async () => {
    try {
      const job = await NotificationQueue.findOneAndUpdate(
        {
          status: "pending",
          $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: new Date() } }],
        },
        {
          status: "processing",
          lockedAt: new Date(),
        },
        { sort: { createdAt: 1 }, new: true }
      );

      if (!job) return;

      let smsSuccess = true;
      let emailSuccess = true;
      let errorLog = [];

      // console.log(`📤 Sending Notification | ${job.type} | ${job._id}`);

      // SMS
      if (job.phoneNo && job.message) {
        const sms = await sendSMS(job.phoneNo, job.message);
        smsSuccess = sms?.status === true;
        if (!smsSuccess) errorLog.push("SMS_FAILED");
      }

      // EMAIL
      if (job.email && job.mailContent) {
        const emailSuccess = await sendMail(job.email, job.subject, job.mailContent);

        if (!emailSuccess) errorLog.push("EMAIL_FAILED");
      }

      // SUCCESS
      if (smsSuccess && emailSuccess) {
        job.status = "success";
        job.lockedAt = null;
        await job.save();
        return;
      }

      // RETRY LOGIC
      job.attempts = (job.attempts || 0) + 1;
      job.lastError = errorLog.join(",");

      if (job.attempts >= 3) {
        job.status = "failed";

        await FailedNotification.create({
          userId: job.userId,
          phoneNo: job.phoneNo,
          email: job.email,
          type: job.type,
          attempts: job.attempts,
          reason: job.lastError,
        });
      } else {
        job.status = "pending";
        job.nextRetryAt = new Date(Date.now() + job.attempts * 60 * 1000); // ⏱ backoff
      }

      job.lockedAt = null;
      await job.save();
    } catch (err) {
      if (job) {
        job.status = "pending";
        job.lockedAt = null;
        await job.save();
      }
    }
  }, 2000);
};

startNotificationWorker();
