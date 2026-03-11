// middlewares/messageQueue.middleware.js
import { NotificationQueue } from "../models/notificationQueue.Model.js";
import { addToQueue } from "../utils/addToQueue.js";
import { getActiveSchemePeriod } from "../utils/getActiveSchemePeriod.js";

export const queueAfterSuccess = async (req, res, next) => {
    
  const oldJson = res.json;

  res.json = async function (data) {
    try {
        
      // If response is success and contains applicationFeePaid flag
      if (data?.success && req?.body?.applicationFeePaid) {
        const period = await getActiveSchemePeriod(doc.schemeId);
        await addToQueue({
          templateId: "AV004",
          user,
          context: {
            applicantName: user.fullName,
            lastDate: period?.closeDate || "N/A",
            applicationId: doc._id,
            amount: doc.applicationFeePaidAmount,
          },
        });
        // await NotificationQueue.create({
        //   userId: req.body.userId,
        //   phoneNo: req.body.phoneNo,
        //   email: req.body.email,
        //   type: "APPLICATION_FEE",
        //   payload: {
        //     amount: req.body.amount,
        //     appNo: req.body.applicationNo,
        //   },
        // });

      }
    } catch (err) {
      console.error("Queue error:", err);
    }

    return oldJson.call(this, data);
  };

  next();
};


