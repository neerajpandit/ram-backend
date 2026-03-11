import mongoose from "mongoose";
import cron from "node-cron";
import { SchemePeriod } from "../models/scheme.Model.js";
import { Property } from "../models/property.Model.js";
import { Payment } from "../models/payment.Model.js";
import { sendMailReport } from "./emailService.js";
import puppeteer from "puppeteer";

export const parseEmails = (value = "") =>
  value
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

export const getSchemePropertyWiseReport = async (schemeId) => {
  return Property.aggregate([
    {
      $match: {
        schemeId: new mongoose.Types.ObjectId(schemeId),
      },
    },
    {
      $lookup: {
        from: "applications",
        localField: "_id",
        foreignField: "propertyId",
        as: "applications",
      },
    },
    {
      $lookup: {
        from: "payments",
        let: { applicationIds: "$applications._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$applicationId", "$$applicationIds"] },
                  { $eq: ["$status", "success"] },
                  { $eq: ["$paymentType", "EMD_FEE"] },
                ],
              },
            },
          },
        ],
        as: "emdPayments",
      },
    },
    {
      $addFields: {
        emdFee: { $ifNull: [{ $sum: "$emdPayments.amount" }, 0] },
        uniqueUserIds: {
          $setUnion: [
            [],
            {
              $map: {
                input: "$emdPayments",
                as: "p",
                in: "$$p.userId",
              },
            },
          ],
        },
      },
    },
    {
      $project: {
        propertyTitle: "$title",
        totalUnits: 1,
        totalApplications: { $size: "$uniqueUserIds" },
        emdFee: 1,
      },
    },
  ]);
};

export const getSchemePaymentSummary = async (schemeId) => {
  return Payment.aggregate([
    { $match: { status: "success" } },
    {
      $lookup: {
        from: "applications",
        localField: "applicationId",
        foreignField: "_id",
        as: "application",
      },
    },
    { $unwind: "$application" },
    {
      $match: {
        "application.schemeId": new mongoose.Types.ObjectId(schemeId),
      },
    },
    {
      $group: {
        _id: "$paymentType",
        users: { $addToSet: "$userId" },
        totalAmount: { $sum: "$amount" },
      },
    },
    {
      $project: {
        paymentType: "$_id",
        userCount: { $size: "$users" },
        totalAmount: 1,
      },
    },
  ]);
};

export const getActiveSchemes = async () => {
  const now = new Date();

  return SchemePeriod.find({
    openDate: { $lte: now },
    closeDate: { $gte: now },
    status: "0",
  }).populate("schemeId");
};

export const buildSchemeCollectionReportHTML = (
  scheme,
  paymentStats,
  propertyWise,
) => {
  const appFee =
    paymentStats.find((p) => p.paymentType === "APPLICATION_FEE") || {};
  const emdFee = paymentStats.find((p) => p.paymentType === "EMD_FEE") || {};

  const grandTotal = (appFee.totalAmount || 0) + (emdFee.totalAmount || 0);

  const propertyRows = propertyWise
    .map(
      (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.propertyTitle}</td>
        <td>${p.totalUnits}</td>
        <td>${p.totalApplications}</td>
        <td><b>₹${p.emdFee.toLocaleString()}</b></td>
      </tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f5f6fa;
      padding: 20px;
    }
    h2, h3 {
      color: #2c3e50;
      margin-bottom: 10px;
    }
    .card {
      background: #ffffff;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      font-size: 13px;
      text-align: center;
    }
    th {
      background: #34495e;
      color: #ffffff;
    }
    .summary {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 15px;
    }
    .summary div {
      background: #ecf0f1;
      padding: 12px;
      border-radius: 6px;
      min-width: 220px;
      font-size: 16px;
    }
  </style>
</head>

<body>

  <h2>📊 ${scheme.title} – Collection Summary Report</h2>

  <!-- OVERALL SUMMARY -->
  <div class="card">
    <h3>Overall Summary</h3>

    <div class="summary">
      <div>
        <strong>Application Fee Users:</strong>
        ${appFee.userCount || 0}
      </div>
      <div>
        <strong>EMD Fee Users:</strong>
        ${emdFee.userCount || 0}
      </div>
      <div>
        <strong>Grand Total:</strong>
        ₹${grandTotal.toLocaleString()}
      </div>
    </div>
  </div>

  <!-- PROPERTY WISE -->
  <div class="card">
    <h3>Property Wise Collection</h3>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Property</th>
          <th>Total Units</th>
          <th>Applications</th>
          <th>Total Collection</th>
        </tr>
      </thead>
      <tbody>
        ${propertyRows || `<tr><td colspan="5">No Data</td></tr>`}
        <tr>
          <th colspan="4">Grand Total</th>
          <th>₹${(emdFee.totalAmount || 0).toLocaleString()}</th>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- PAYMENT SUMMARY -->
  <div class="card">
    <h3>Payment Summary</h3>

    <table>
      <thead>
        <tr>
          <th>Fee Type</th>
          <th>Paid Users</th>
          <th>Total Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Application Fee</td>
          <td>${appFee.userCount || 0}</td>
          <td>₹${(appFee.totalAmount || 0).toLocaleString()}</td>
        </tr>
        <tr>
          <td>EMD Fee</td>
          <td>${emdFee.userCount || 0}</td>
          <td>₹${(emdFee.totalAmount || 0).toLocaleString()}</td>
        </tr>
        <tr>
          <th colspan="2">Grand Total</th>
          <th>₹${grandTotal.toLocaleString()}</th>
        </tr>
      </tbody>
    </table>
  </div>

  <p style="font-size:12px;color:#7f8c8d">
    This is an automated system generated report.
    <br/>
    Scheme report is generated only while scheme is active.
  </p>

</body>
</html>
`;
};

export const generateCollectionPDF = async (html) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-web-security",
    ],
  });

  const page = await browser.newPage();

  /* -------------------------------------------------
       ✅ SSRF PROTECTION: BLOCK ALL NETWORK REQUESTS
    ------------------------------------------------- */
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = request.url();

    // Allow only local / inline resources
    if (url.startsWith("data:") || url === "about:blank") {
      request.continue();
    } else {
      request.abort(); // 🚫 Block external/internal URLs
    }
  });

  await page.setJavaScriptEnabled(false);
  await page.setContent(html, { waitUntil: "networkidle0" });
  
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "20px",
      bottom: "20px",
      left: "15px",
      right: "15px",
    },
  });

  await browser.close();
  // res.setHeader("Content-Type", "application/pdf");
  // res.setHeader("Content-Length", pdfBuffer.length);
  return pdfBuffer;
};

export const sendActiveSchemeCollectionReports = async () => {
  const activeSchemes = await getActiveSchemes();

  if (!activeSchemes.length) {
    // console.log("ℹ️ No active schemes. Scheme MIS skipped.");
    return true;
  }

  for (const period of activeSchemes) {
    const scheme = period.schemeId;

    const paymentStats = await getSchemePaymentSummary(scheme._id);
    const propertyWise = await getSchemePropertyWiseReport(scheme._id);

    const html = buildSchemeCollectionReportHTML(
      scheme,
      paymentStats,
      propertyWise,
    );

    const pdfBuffer = await generateCollectionPDF(html);

    await sendMailReport(
      parseEmails(process.env.COLLECTION_REPORT_TO),
      `📊 ${scheme.title} – Daily Collection Report`,
      html,
      parseEmails(process.env.COLLECTION_REPORT_CC),
      parseEmails(process.env.COLLECTION_REPORT_BCC),
      [
        {
          filename: `${scheme.title}_Collection_${new Date()
            .toISOString()
            .slice(0, 10)}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    );

    // console.log(`✅ Scheme MIS sent for ${scheme.title}`);
  }

  return true;
};

export const sendMISFailureAlert = async (error, context = {}) => {
  try {
    const subject = "🚨 MIS Collection Report FAILED";

    const html = `
      <html>
      <body style="font-family:Arial">
        <h2 style="color:#c0392b">🚨 MIS Job Failure Alert</h2>

        <p><b>Time:</b> ${new Date().toISOString()}</p>
        <p><b>Service:</b> Collection MIS Cron</p>

        <h3>Error Message</h3>
        <pre style="background:#f4f4f4;padding:10px;border-radius:5px">
${error?.message || error}
        </pre>

        ${
          error?.stack
            ? `<h3>Stack Trace</h3>
               <pre style="background:#f4f4f4;padding:10px;border-radius:5px">
${error.stack}
               </pre>`
            : ""
        }

        ${
          Object.keys(context).length
            ? `<h3>Context</h3>
               <pre>${JSON.stringify(context, null, 2)}</pre>`
            : ""
        }

        <p style="color:#777;font-size:12px">
          This is an automated system alert. Immediate action required.
        </p>
      </body>
      </html>
    `;

    await sendMailReport(
      parseEmails(process.env.MIS_ALERT_TO || process.env.COLLECTION_REPORT_TO),
      subject,
      html,
      [],
      [],
    );

    // console.log("🚨 MIS failure alert email sent");
  } catch (mailErr) {
    // LAST LINE OF DEFENSE – NEVER THROW FROM ALERT
    console.error("❌ Failed to send MIS failure alert", mailErr);
  }
};

const CRON_TIME = process.env.COLLECTION_REPORT_CRON || "0 18 * * *";
let isReportRunning = false;

/**
 * Generic retry wrapper
 */
const runWithRetry = async (fn, retries = 2) => {
  let lastError;
  for (let i = 1; i <= retries + 1; i++) {
    try {
      // console.log(`📊 MIS Attempt ${i}`);
      await fn();
      return;
    } catch (err) {
      lastError = err;
      console.error(`❌ Attempt ${i} failed`, err.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  throw lastError;
};

cron.schedule(
  CRON_TIME,
  async () => {
    if (isReportRunning) {
      console.warn("⚠️ MIS already running. Skipping this cycle.");
      return;
    }

    isReportRunning = true;
    const start = Date.now();

    // console.log("📊 MIS Cron Started", new Date().toISOString());

    try {

      // ✅ NEW: Scheme-wise reports
      await runWithRetry(sendActiveSchemeCollectionReports, 2);

      // console.log("✅ MIS Cron Completed Successfully");
    } catch (err) {
      console.error("❌ MIS Cron FAILED", err);
      // Optional: alert admin / Slack / Email
    } finally {
      isReportRunning = false;
      // console.log("⏱️ MIS Cron Finished in", Date.now() - start, "ms");
    }
  },
  {
    timezone: "Asia/Kolkata",
  },
);
