import ExcelJS from "exceljs";
import mongoose from "mongoose";
import { Application } from "../models/application.Model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AdminPropertyAccess } from "../models/adminPropertyMapping.Model.js";


export const downloadApplicantsMISExcelold = asyncHandler(async (req, res) => {
  const { schemeId } = req.params;

  if (!schemeId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: "Invalid Scheme ID",
    });
  }

  let {
    location,
    fromDate,
    toDate,
    applicationStatus,
    allotmentStatus,
    applicationFee,
    emdFee,
    propertyTitle,
  } = req.query;

  // ------------------ BASE FILTER ------------------
  let filter = {
    schemeId: new mongoose.Types.ObjectId(schemeId),
    status: "0",
    applicationFeePaid: true,
  };

  if (applicationStatus) {
    filter.applicationStatus = decodeURIComponent(applicationStatus);
  }

  if (allotmentStatus) {
    filter.allotedStatus = decodeURIComponent(allotmentStatus);
  }

  if (applicationFee !== undefined) {
    filter.applicationFeePaid = applicationFee === "true";
  }

  if (emdFee !== undefined) {
    filter.emdFeePaid = emdFee === "true";
  }

  // ------------------ DATE FILTER ------------------
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      filter.createdAt.$gte = start;
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  // ------------------ PROPERTY FILTER ------------------
  let propertyFilter = {};

  if (location) {
    propertyFilter["property.city"] = decodeURIComponent(location);
  }

  if (propertyTitle) {
    propertyFilter["property.title"] = {
      $regex: decodeURIComponent(propertyTitle),
      $options: "i",
    };
  }

  // ------------------ AGGREGATION ------------------
  const applicants = await Application.aggregate([
    { $match: filter },

    {
      $lookup: {
        from: "properties",
        localField: "propertyId",
        foreignField: "_id",
        as: "property",
      },
    },
    { $unwind: { path: "$property", preserveNullAndEmptyArrays: true } },

    ...(Object.keys(propertyFilter).length ? [{ $match: propertyFilter }] : []),

    {
      $lookup: {
        from: "userauths",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

    {
      $project: {
        _id: 0,
        applicationId: "$applicationId",
        applicantName: "$user.fullName",
        applicantPhone: "$user.phoneNumber",
        applicantEmail: "$user.email",
        propertyTitle: "$property.title",
        city: "$property.city",
        applicationStatus: "$applicationStatus",
        allotmentStatus: "$allotedStatus",
        applicationFeePaid: "$applicationFeePaid",
        emdFeePaid: "$emdFeePaid",
        applicationFeeAmount: "$applicationFeePaidAmount",
        emdFeeAmount: "$emdFeePaidAmount",
        appliedAt: "$appliedAt",
      },
    },

    { $sort: { appliedAt: -1 } },
  ]);

  // ------------------ EXCEL GENERATION ------------------
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Applicants MIS");

  // ------------------ FILTER SUMMARY (TOP) ------------------
  let rowIndex = 1;

  const formatDate = (date) =>
    date
      ? new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        }).format(new Date(date))
      : "All";

  worksheet.mergeCells(`A${rowIndex}:M${rowIndex}`);
  worksheet.getCell(`A${rowIndex}`).value = "Applicants MIS Report";
  worksheet.getCell(`A${rowIndex}`).font = { size: 14, bold: true };
  rowIndex += 2;

  const filterRows = [
    ["Scheme ID", schemeId],
    ["Location", location ? decodeURIComponent(location) : "All"],
    ["From Date", formatDate(fromDate)],
    ["To Date", formatDate(toDate)],
    [
      "Application Status",
      applicationStatus ? decodeURIComponent(applicationStatus) : "All",
    ],
    [
      "Allotment Status",
      allotmentStatus ? decodeURIComponent(allotmentStatus) : "All",
    ],
    [
      "Application Fee Paid",
      applicationFee ? (applicationFee === "true" ? "Yes" : "No") : "All",
    ],
    ["EMD Fee Paid", emdFee ? (emdFee === "true" ? "Yes" : "No") : "All"],
    ["Generated On", formatDate(new Date())],
  ];

  filterRows.forEach(([label, value]) => {
    worksheet.getCell(`A${rowIndex}`).value = label;
    worksheet.getCell(`B${rowIndex}`).value = value;
    worksheet.getCell(`A${rowIndex}`).font = { bold: true };
    rowIndex++;
  });

  rowIndex += 2; // gap before table

  // ------------------ TABLE HEADER ------------------
  worksheet.columns = [
    { header: "Application ID", key: "applicationId", width: 20 },
    { header: "Applicant Name", key: "applicantName", width: 25 },
    { header: "Phone", key: "applicantPhone", width: 15 },
    { header: "Email", key: "applicantEmail", width: 30 },
    { header: "Property", key: "propertyTitle", width: 25 },
    { header: "City", key: "city", width: 15 },
    { header: "Application Status", key: "applicationStatus", width: 20 },
    { header: "Allotment Status", key: "allotmentStatus", width: 20 },
    { header: "App Fee Paid", key: "applicationFeePaid", width: 15 },
    { header: "EMD Paid", key: "emdFeePaid", width: 15 },
    { header: "App Fee Amount", key: "applicationFeeAmount", width: 18 },
    { header: "EMD Amount", key: "emdFeeAmount", width: 18 },
    { header: "Applied Date", key: "appliedAt", width: 18 },
  ];

  // Add header row manually at correct position
  worksheet.spliceRows(
    rowIndex,
    0,
    worksheet.columns.map((col) => col.header)
  );
  const headerRow = worksheet.getRow(rowIndex);

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4472C4" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  rowIndex++;

  // ------------------ TABLE DATA ------------------
  applicants.forEach((row) => {
    worksheet.addRow({
      ...row,
      appliedAt: row.appliedAt ? formatDate(row.appliedAt) : "",
    });
  });

  // ------------------ HEADER STYLE ------------------
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4472C4" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // ------------------ RESPONSE ------------------
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=Applicants_MIS_${Date.now()}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
});
export const downloadApplicantsMISExcel = asyncHandler(async (req, res) => {
  const { schemeId } = req.params;
  

  if (!schemeId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: "Invalid Scheme ID",
    });
  }

  let {
    location,
    fromDate,
    toDate,
    applicationStatus,
    allotmentStatus,
    applicationFee,
    emdFee,
    propertyTitle,
  } = req.query;

  // ------------------ BASE FILTER ------------------
  let filter = {
    schemeId: new mongoose.Types.ObjectId(schemeId),
    status: "0",
    applicationFeePaid: true,
  };

  if (applicationStatus)
    filter.applicationStatus = decodeURIComponent(applicationStatus);
  if (allotmentStatus)
    filter.allotedStatus = decodeURIComponent(allotmentStatus);
  if (applicationFee !== undefined)
    filter.applicationFeePaid = applicationFee === "true";
  if (emdFee !== undefined) filter.emdFeePaid = emdFee === "true";

  // ------------------ DATE FILTER ------------------
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      filter.createdAt.$gte = start;
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  // ------------------ PROPERTY FILTER ------------------
  let propertyFilter = {};

  if (location) propertyFilter["property.city"] = decodeURIComponent(location);
  if (propertyTitle)
    propertyFilter["property.title"] = {
      $regex: decodeURIComponent(propertyTitle),
      $options: "i",
    };

  // ------------------ ROLE-BASED PROPERTY FILTER ------------------
  if (req.user.role === 1) {
    // Admin → only properties assigned to this admin
    const assignedProperties = await AdminPropertyAccess.find({
      userId: req.user._id,
    });
    const allowedPropertyIds = assignedProperties.map((p) => p.propertyId);

    // If no assigned properties, return empty result
    if (!allowedPropertyIds.length) {
      return res.status(200).json({
        success: true,
        message: "No applicants found for your assigned properties",
        data: [],
      });
    }

    filter.propertyId = { $in: allowedPropertyIds };
  }

  // ------------------ AGGREGATION ------------------
  const applicants = await Application.aggregate([
    { $match: filter },

    {
      $lookup: {
        from: "properties",
        localField: "propertyId",
        foreignField: "_id",
        as: "property",
      },
    },
    { $unwind: { path: "$property", preserveNullAndEmptyArrays: true } },

    ...(Object.keys(propertyFilter).length ? [{ $match: propertyFilter }] : []),

    {
      $lookup: {
        from: "userauths",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

    {
      $project: {
        _id: 0,
        applicationId: "$applicationId",
        applicantName: "$user.fullName",
        applicantPhone: "$user.phoneNumber",
        applicantEmail: "$user.email",
        propertyTitle: "$property.title",
        city: "$property.city",
        applicationStatus: "$applicationStatus",
        allotmentStatus: "$allotedStatus",
        applicationFeePaid: "$applicationFeePaid",
        emdFeePaid: "$emdFeePaid",
        applicationFeeAmount: "$applicationFeePaidAmount",
        emdFeeAmount: "$emdFeePaidAmount",
        appliedAt: "$appliedAt",
      },
    },

    { $sort: { appliedAt: -1 } },
  ]);

  // ------------------ EXCEL GENERATION ------------------
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Applicants MIS");

  // ------------------ FILTER SUMMARY (TOP) ------------------
  let rowIndex = 1;
  const formatDate = (date) =>
    date
      ? new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        }).format(new Date(date))
      : "All";

  worksheet.mergeCells(`A${rowIndex}:M${rowIndex}`);
  worksheet.getCell(`A${rowIndex}`).value = "Applicants MIS Report";
  worksheet.getCell(`A${rowIndex}`).font = { size: 14, bold: true };
  rowIndex += 2;

  const filterRows = [
    ["Scheme ID", schemeId],
    ["Location", location ? decodeURIComponent(location) : "All"],
    ["From Date", formatDate(fromDate)],
    ["To Date", formatDate(toDate)],
    [
      "Application Status",
      applicationStatus ? decodeURIComponent(applicationStatus) : "All",
    ],
    [
      "Allotment Status",
      allotmentStatus ? decodeURIComponent(allotmentStatus) : "All",
    ],
    [
      "Application Fee Paid",
      applicationFee ? (applicationFee === "true" ? "Yes" : "No") : "All",
    ],
    ["EMD Fee Paid", emdFee ? (emdFee === "true" ? "Yes" : "No") : "All"],
    ["Generated On", formatDate(new Date())],
  ];

  filterRows.forEach(([label, value]) => {
    worksheet.getCell(`A${rowIndex}`).value = label;
    worksheet.getCell(`B${rowIndex}`).value = value;
    worksheet.getCell(`A${rowIndex}`).font = { bold: true };
    rowIndex++;
  });

  rowIndex += 2;

  // ------------------ TABLE HEADER ------------------
  worksheet.columns = [
    { header: "Application ID", key: "applicationId", width: 20 },
    { header: "Applicant Name", key: "applicantName", width: 25 },
    { header: "Phone", key: "applicantPhone", width: 15 },
    { header: "Email", key: "applicantEmail", width: 30 },
    { header: "Property", key: "propertyTitle", width: 25 },
    { header: "City", key: "city", width: 15 },
    { header: "Application Status", key: "applicationStatus", width: 20 },
    { header: "Allotment Status", key: "allotmentStatus", width: 20 },
    { header: "App Fee Paid", key: "applicationFeePaid", width: 15 },
    { header: "EMD Paid", key: "emdFeePaid", width: 15 },
    { header: "App Fee Amount", key: "applicationFeeAmount", width: 18 },
    { header: "EMD Amount", key: "emdFeeAmount", width: 18 },
    { header: "Applied Date", key: "appliedAt", width: 18 },
  ];

  worksheet.spliceRows(
    rowIndex,
    0,
    worksheet.columns.map((col) => col.header)
  );
  const headerRow = worksheet.getRow(rowIndex);

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4472C4" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  rowIndex++;

  applicants.forEach((row) => {
    worksheet.addRow({
      ...row,
      appliedAt: row.appliedAt ? formatDate(row.appliedAt) : "",
    });
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=Applicants_MIS_${Date.now()}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
});


//Today update
export const downloadApplicantsFinalMISExcel = asyncHandler(
  async (req, res) => {
    const { schemeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(schemeId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Scheme ID" });
    }

    /* -------------------------------------------------
       FETCH APPLICATIONS
    ------------------------------------------------- */
    const applications = await Application.aggregate([
      {
        $match: {
          schemeId: new mongoose.Types.ObjectId(schemeId),
          status: "0",
          applicationFeePaid: true,
          emdFeePaid: true,
        },
      },

      // USER
      {
        $lookup: {
          from: "userauths",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      // PROPERTY
      {
        $lookup: {
          from: "properties",
          localField: "propertyId",
          foreignField: "_id",
          as: "property",
        },
      },
      { $unwind: { path: "$property", preserveNullAndEmptyArrays: true } },

      // MULTI PAYMENT
      {
        $addFields: {
          appFeePayments: {
            $filter: {
              input: "$paymentHistory",
              as: "p",
              cond: { $eq: ["$$p.type", "APPLICATION_FEE"] },
            },
          },
          emdFeePayments: {
            $filter: {
              input: "$paymentHistory",
              as: "p",
              cond: { $eq: ["$$p.type", "EMD_FEE"] },
            },
          },
        },
      },

      {
        $sort: {
          "property.title": 1,
          "applicantSnapshot.categoryDetails.reservationCategory": 1,
          "applicantSnapshot.categoryDetails.horizontalCategory": 1,
          appliedAt: 1,
        },
      },
    ]).allowDiskUse(true);

    /* -------------------------------------------------
       EXCEL
    ------------------------------------------------- */
    const wb = new ExcelJS.Workbook();

    /* -------------------------------------------------
       HELPERS
    ------------------------------------------------- */
    const joinValues = (arr, key) =>
      Array.isArray(arr) && arr.length
        ? arr
            .map((p) => p?.[key])
            .filter(Boolean)
            .join(", ")
        : "";

    const sumValues = (arr, key) =>
      Array.isArray(arr) && arr.length
        ? arr.reduce((sum, p) => sum + Number(p?.[key] || 0), 0)
        : 0;

    const sanitizeSheetName = (name) =>
      name?.replace(/[\\\/\?\*\[\]:]/g, "").substring(0, 31) ||
      "UNKNOWN_PROPERTY";

    /* -------------------------------------------------
       CREATE SHEETS PER PROPERTY
    ------------------------------------------------- */
    const sheetMap = {};

    const getSheet = (propertyTitle) => {
      const safeName = sanitizeSheetName(propertyTitle);

      if (!sheetMap[safeName]) {
        const ws = wb.addWorksheet(safeName);

        ws.columns = [
          { header: "Application ID", key: "applicationId", width: 22 },
          { header: "Applicant Name", key: "userName", width: 25 },
          { header: "Applicant Mobile", key: "userMobile", width: 15 },
          { header: "Applicant Email", key: "userEmail", width: 30 },

          {
            header: "Application Fee Paid",
            key: "applicationFeePaid",
            width: 18,
          },
          {
            header: "Application Fee Amount",
            key: "applicationFeePaidAmount",
            width: 18,
          },
          { header: "App Fee Payment IDs", key: "appFeePaymentId", width: 30 },
          { header: "App Fee Order IDs", key: "appFeeOrderId", width: 30 },

          { header: "EMD Fee Paid", key: "emdFeePaid", width: 15 },
          { header: "EMD Fee Amount", key: "emdFeePaidAmount", width: 15 },
          { header: "EMD Payment IDs", key: "emdPaymentId", width: 30 },
          { header: "EMD Order IDs", key: "emdOrderId", width: 30 },

          { header: "Category", key: "category", width: 15 },
          {
            header: "Horizontal Category",
            key: "horizontalCategory",
            width: 20,
          },

          { header: "Payment Status", key: "paymentStatus", width: 18 },

          { header: "Gender", key: "gender", width: 10 },
          { header: "Age", key: "age", width: 8 },
          { header: "Marital Status", key: "married", width: 15 },
          { header: "Father/Mother/Husband", key: "father", width: 25 },

          { header: "Religion", key: "religion", width: 15 },

          { header: "Bank Name", key: "bankName", width: 22 },
          { header: "Branch Name", key: "branchName", width: 22 },
          { header: "IFSC", key: "ifsc", width: 15 },
          { header: "Account No", key: "accountNo", width: 22 },

          { header: "Declaration", key: "declaration", width: 50 },
        ];

        sheetMap[safeName] = {
          ws,
          lastCategory: null,
          lastHorizontal: null,
        };
      }

      return sheetMap[safeName];
    };

    /* -------------------------------------------------
       WRITE DATA
    ------------------------------------------------- */
    applications.forEach((a) => {
      const propertyTitle = a.property?.title || "UNKNOWN_PROPERTY";
      const category =
        a.applicantSnapshot?.categoryDetails?.reservationCategory;
      const horizontal =
        a.applicantSnapshot?.categoryDetails?.horizontalCategory;

      const sheetObj = getSheet(propertyTitle);
      const ws = sheetObj.ws;

      if (category !== sheetObj.lastCategory) {
        const r = ws.addRow([`CATEGORY : ${category}`]);
        ws.mergeCells(`A${r.number}:Z${r.number}`);
        r.font = { bold: true };
        sheetObj.lastCategory = category;
        sheetObj.lastHorizontal = null;
      }

      if (horizontal !== sheetObj.lastHorizontal) {
        const r = ws.addRow([`HORIZONTAL CATEGORY : ${horizontal}`]);
        ws.mergeCells(`A${r.number}:Z${r.number}`);
        r.font = { bold: true };
        sheetObj.lastHorizontal = horizontal;
      }

      ws.addRow({
        applicationId: a.applicationId,
        userName: a.user.fullName,
        userMobile: a.user.phoneNumber,
        userEmail: a.user.email,

        applicationFeePaid: a.applicationFeePaid ? "Paid" : "Unpaid",
        applicationFeePaidAmount: sumValues(a.appFeePayments, "amount"),
        appFeePaymentId: joinValues(a.appFeePayments, "paymentId"),
        appFeeOrderId: joinValues(a.appFeePayments, "orderId"),

        emdFeePaid: a.emdFeePaid ? "Paid" : "Unpaid",
        emdFeePaidAmount: sumValues(a.emdFeePayments, "amount"),
        emdPaymentId: joinValues(a.emdFeePayments, "paymentId"),
        emdOrderId: joinValues(a.emdFeePayments, "orderId"),

        category,
        horizontalCategory: horizontal,

        paymentStatus: a.paymentStatus,

        gender: a.applicantSnapshot.personalDetails.gender,
        age: a.applicantSnapshot.personalDetails.age,
        married: a.applicantSnapshot.personalDetails.married,
        father: a.applicantSnapshot.personalDetails.fatherMotherHusbandName,

        religion: a.applicantSnapshot.categoryDetails.religion,

        bankName: a.applicantSnapshot.bankDetails.bankName,
        branchName: a.applicantSnapshot.bankDetails.branchName,
        ifsc: a.applicantSnapshot.bankDetails.ifscCode,
        accountNo: a.applicantSnapshot.bankDetails.refundAccountNumber,

        declaration: a.applicantSnapshot.declaration,
      });
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=FINAL_MIS_${Date.now()}.xlsx`
    );
    await wb.xlsx.write(res);
    res.end();
  }
);
