import cron from "node-cron";
import { AV_TEMPLATES } from "../template/mailTemplate.js";
import { canSendAgain } from "../notificationFrequency.js";
import { addToQueue } from "../addToQueue.js";
import { User } from "../../models/userAuth.Model.js";
import { getActiveSchemePeriod } from "../getActiveSchemePeriod.js";
import { Application } from "../../models/application.Model.js";

const FREQUENCY_MAP = {
  DAILY: 1,
  ALTERNATE_DAY: 2,
  EVERY_3RD_DAY: 3,
};

cron.schedule("0 10 * * *", async () => {
  // console.log("⏰ Global Notification Cron Running");

  const users = await User.find({ status: "0", role: 2 });

  for (const user of users) {
    // 1️⃣ Build context
    const ctx = {
      isSchemeActive: true, // from Scheme table
      brochurePaid: user.brochurePaid,
      applicationStarted: user.applicationStarted,
      applicationFilled: user.applicationFilled,
      propertySelected: user.propertySelected,
      emdFeePaid: user.emdFeePaid,
    };

    // 2️⃣ Loop ALL templates
    for (const template of Object.values(AV_TEMPLATES)) {
      // Condition check
      if (!template.condition(ctx)) continue;

      const gapDays = FREQUENCY_MAP[template.frequency] || 1;

      // Frequency + maxDays check
      const allowed = await canSendAgain({
        userId: user._id,
        type: template.id,
        gapDays,
        maxCount: template.maxDays,
      });

      if (!allowed) continue;
      const doc = await Application.findOne({ userId: user._id }).sort({ createdAt: -1 });
      const period = await getActiveSchemePeriod(doc.schemeId);
      // 3️⃣ Add to queue
      await addToQueue({
        templateId: template.id,
        user,
        context: {
          applicantName: user.fullName,
          lastDate: period?.closeDate || "N/A",
        },
      });
    }
  }
});
