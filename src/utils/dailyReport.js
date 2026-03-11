import { userAuth } from "../models/userAuth.Model.js";
import { Application } from "../models/application.Model.js";
import { Payment } from "../models/payment.Model.js";
import mongoose from "mongoose";
import cron from "node-cron";
import { sendMailReport } from "./emailService.js";
import puppeteer from "puppeteer";


export const getOverallSchemePropertyReport = async () => {
  const [
    totalUsers,
    totalApplications,
    totalEmdPaidUsers,
    paymentStats,
    schemeWise,
    propertyWise,
  ] = await Promise.all([
    // ---------------- OVERALL COUNTS ----------------
    userAuth.countDocuments({ role: 2, status: "0" }),

    Application.countDocuments({
      applicationFeePaid: true,
      status: "0",
    }),

    Application.countDocuments({
      applicationFeePaid: true,
      emdFeePaid: true,
      status: "0",
    }),

    // ---------------- PAYMENT OVERALL ----------------
    Payment.aggregate([
      { $match: { status: "success" } },
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
    ]),

    // ---------------- SCHEME WISE ----------------
    Payment.aggregate([
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
        $lookup: {
          from: "schemes",
          localField: "application.schemeId",
          foreignField: "_id",
          as: "scheme",
        },
      },
      { $unwind: "$scheme" },
      {
        $group: {
          _id: "$scheme._id",
          schemeTitle: { $first: "$scheme.title" },
          applications: { $addToSet: "$application._id" },
          totalCollection: { $sum: "$amount" },
          applicationFee: {
            $sum: {
              $cond: [
                { $eq: ["$paymentType", "APPLICATION_FEE"] },
                "$amount",
                0,
              ],
            },
          },
          emdFee: {
            $sum: {
              $cond: [{ $eq: ["$paymentType", "EMD_FEE"] }, "$amount", 0],
            },
          },
        },
      },
      {
        $project: {
          schemeTitle: 1,
          totalApplications: { $size: "$applications" },
          totalCollection: 1,
          applicationFee: 1,
          emdFee: 1,
        },
      },
    ]),

    // ---------------- PROPERTY WISE (FIXED: SHOW ZERO EMD PROPERTIES) ----------------
// ---------------- PROPERTY WISE (FIXED: UNIQUE USER COUNT) ----------------
Property.aggregate([
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
    $lookup: {
      from: "schemes",
      localField: "schemeId",
      foreignField: "_id",
      as: "scheme",
    },
  },
  { $unwind: "$scheme" },

  // --------- GROUP TO CALCULATE UNIQUE USERS ---------
  {
    $addFields: {
      emdFee: { $ifNull: [{ $sum: "$emdPayments.amount" }, 0] },
    },
  },
  {
    $addFields: {
      uniqueUserIds: {
        $map: {
          input: "$emdPayments",
          as: "p",
          in: "$$p.userId",
        },
      },
    },
  },
  {
    $project: {
      schemeTitle: "$scheme.title",
      propertyCode: 1,
      propertyTitle: "$title",
      totalApplications: { $size: { $setUnion: ["$uniqueUserIds", []] } }, // unique user count
      emdFee: 1,
      totalUnits: 1,
    },
  },
])
  ]);

  // ---------------- EXTRACT PAYMENT DATA ----------------
  const appFee =
    paymentStats.find((p) => p.paymentType === "APPLICATION_FEE") || {};
  const emdFee = paymentStats.find((p) => p.paymentType === "EMD_FEE") || {};

  return {
    overall: {
      totalRegisteredUsers: totalUsers,
      totalApplications,
      totalEmdPaidUsers,
      applicationFeeUsers: appFee.userCount || 0,
      applicationFeeAmount: appFee.totalAmount || 0,
      emdFeeUsers: emdFee.userCount || 0,
      emdFeeAmount: emdFee.totalAmount || 0,
      grandTotal: (appFee.totalAmount || 0) + (emdFee.totalAmount || 0),
    },
    schemeWise,
    propertyWise,
  };
};

export const buildCollectionReportHTML = (report) => {
  const { overall, schemeWise, propertyWise } = report;

  const schemeRows = schemeWise
    .map(
      (s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${s.schemeTitle}</td>
        <td>${s.totalApplications}</td>
        <td>₹${s.applicationFee.toLocaleString()}</td>
        <td><b>₹${s.totalCollection.toLocaleString()}</b></td>
      </tr>`
    )
    .join("");

  const propertyRows = propertyWise
    .map(
      (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.propertyTitle}</td>
        <td>${p.totalUnits}</td>
        <td>${p.totalApplications}</td>
        <td><b>₹${p.emdFee.toLocaleString()}</b></td>
      </tr>`
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
      font-size: 18px;
    }
  </style>
</head>

<body>

  <h2>📊 Scheme Collection Summary Report</h2>

  <!-- OVERALL -->
  <div class="card">
    <h3>Overall Summary</h3>

    <div class="summary">
      <div><strong>Total Registered Users:</strong> ${
        overall.totalRegisteredUsers
      }</div>
      <div><strong>Total Application-Fee Paid Users:</strong> ${
        overall.totalApplications
      }</div>
      <div><strong>Total EMD-Fee Paid Users:</strong> ${
        overall.emdFeeUsers
      }</div>
    </div>
  </div>

  <!-- PROPERTY WISE -->
  <div class="card">
    <h3>Property Wise Collection</h3>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Scheme</th>
          <th>Total Units</th>
          <th>Applications</th>
          <th>Total Collection</th>
        </tr>
      </thead>
      <tbody>
        ${propertyRows || `<tr><td colspan="5">No Data</td></tr>`}
        <tr>
          <th colspan="4">Grand Total</th>
          <th>₹${overall.emdFeeAmount.toLocaleString()}</th>
        </tr>
      </tbody>
    </table>
  </div>
    <!-- OVERALL -->
  <div class="card">
    <h3>Overall Summary</h3>

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
          <td>${overall.applicationFeeUsers}</td>
          <td>₹${overall.applicationFeeAmount.toLocaleString()}</td>
        </tr>
        <tr>
          <td>EMD Fee</td>
          <td>${overall.emdFeeUsers}</td>
          <td>₹${overall.emdFeeAmount.toLocaleString()}</td>
        </tr>
        <tr>
          <th colspan="2">Grand Total</th>
          <th>₹${overall.grandTotal.toLocaleString()}</th>
        </tr>
      </tbody>
    </table>
  </div>


  <p style="font-size:12px;color:#7f8c8d">
    This is an automated system generated report.
  </p>

</body>
</html>
`;
};

export const generateCollectionPDF = async (html) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
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
  return pdfBuffer;
};

export const downloadCollectionReportPDF = async (req, res) => {
  try {

    const report = await getOverallSchemePropertyReport();

    const html = buildCollectionReportHTML(report);
    const pdfBuffer = await generateCollectionPDF(html);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Collection_Report.pdf"'
    );

    res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ PDF download failed:", error);
    res.status(500).send("Error generating PDF report");
  }
};

export const downloadCollectionReport = async (req, res) => {
  try {
    // 1. Fetch the data
    const report = await getOverallSchemePropertyReport();

    // 2. Generate the Excel file buffer
    const excelBuffer = await generateCollectionExcelBuffer(report);

    // 3. Set necessary headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      // This header tells the browser to download the file and names it
      'attachment; filename="Collection_Report_Download.xlsx"'
    );

    // 4. Send the buffer as the response
    res.send(excelBuffer);
  } catch (error) {
    console.error("❌ Excel download failed:", error);
    res.status(500).send("Error generating the Excel report.");
  }
};



export const parseEmails = (value = "") =>
  value
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

export const sendCollectionReport = async () => {
  const report = await getOverallSchemePropertyReport();

  const html = buildCollectionReportHTML(report);
  const pdfBuffer = await generateCollectionPDF(html);

  await sendMailReport(
    parseEmails(process.env.COLLECTION_REPORT_TO),
    "📊 Daily Collection Report",
    html,
    parseEmails(process.env.COLLECTION_REPORT_CC),
    parseEmails(process.env.COLLECTION_REPORT_BCC),
    [
      {
        filename: `Collection_Report_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ]
  );

  return true;
};

const CRON_TIME = process.env.COLLECTION_REPORT_CRON || "0 18 * * *";

// cron.schedule(CRON_TIME, async () => {
//   try {
//     // console.log("📊 Running Daily Collection Report Job");
//     await sendCollectionReport();
//     console.log("✅ Daily Report Email Sent");
//   } catch (err) {
//     // console.error("❌ Collection Report Cron Failed", err);
//   }
// });