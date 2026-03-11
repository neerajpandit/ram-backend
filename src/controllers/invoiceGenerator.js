import { Order, Payment } from "../models/payment.Model.js";
import puppeteer from "puppeteer";
import moment from "moment-timezone";
import path from "path";
import fs from "fs";
import { asyncHandler } from "../utils/asyncHandler.js";
import { __dirname } from "../config/constants.js";
import { Application } from "../models/application.Model.js";
import { Scheme } from "../models/scheme.Model.js";
import { Property } from "../models/property.Model.js";
import { userAuth } from "../models/userAuth.Model.js";

/* ----------------------------------------------------
   Convert Amount To Words
---------------------------------------------------- */

function convertAmountToWords(amount) {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function twoDigitToWords(num) {
    if (num < 20) return a[num];
    return b[Math.floor(num / 10)] + (num % 10 ? "-" + a[num % 10] : "");
  }

  function numberToWords(num) {
    if (num === 0) return "Zero";
    let str = "";

    // Crores
    if (num >= 10000000) {
      str += numberToWords(Math.floor(num / 10000000)) + " Crore ";
      num %= 10000000;
    }

    // Lakhs
    if (num >= 100000) {
      str += numberToWords(Math.floor(num / 100000)) + " Lakh ";
      num %= 100000;
    }

    // Thousands
    if (num >= 1000) {
      str += numberToWords(Math.floor(num / 1000)) + " Thousand ";
      num %= 1000;
    }

    // Hundreds
    if (num >= 100) {
      str += a[Math.floor(num / 100)] + " Hundred ";
      num %= 100;
    }

    // Last two digits
    if (num > 0) {
      if (str !== "") str += "and ";
      str += twoDigitToWords(num) + " ";
    }

    return str.trim();
  }

  return numberToWords(Math.floor(amount)) + " Rupees";
}


function convertAmountToHindiWords(amount) {
  const ones = [
    "",
    "एक",
    "दो",
    "तीन",
    "चार",
    "पाँच",
    "छह",
    "सात",
    "आठ",
    "नौ",
    "दस",
    "ग्यारह",
    "बारह",
    "तेरह",
    "चौदह",
    "पंद्रह",
    "सोलह",
    "सत्रह",
    "अठारह",
    "उन्नीस",
  ];

  const tensSpecial = {
    20: "बीस",
    21: "इक्कीस",
    22: "बाईस",
    23: "तेइस",
    24: "चौबीस",
    25: "पच्चीस",
    26: "छब्बीस",
    27: "सत्ताईस",
    28: "अट्ठाईस",
    29: "उनतीस",
    30: "तीस",
    31: "इकतीस",
    32: "बत्तीस",
    33: "तैंतीस",
    34: "चौंतीस",
    35: "पैंतीस",
    36: "छत्तीस",
    37: "सैंतीस",
    38: "अड़तीस",
    39: "उनतालीस",
    40: "चालीस",
    41: "इकतालीस",
    42: "बयालीस",
    43: "तैतालीस",
    44: "चवालीस",
    45: "पैंतालीस",
    46: "छियालिस",
    47: "सैंतालीस",
    48: "अड़तालीस",
    49: "उनचास",
    50: "पचास",
    51: "इक्यावन",
    52: "बावन",
    53: "तिरेपन",
    54: "चौवन",
    55: "पचपन",
    56: "छप्पन",
    57: "सत्तावन",
    58: "अट्ठावन",
    59: "उनसठ",
    60: "साठ",
    61: "इकसठ",
    62: "बासठ",
    63: "तिरसठ",
    64: "चौंसठ",
    65: "पैंसठ",
    66: "छियासठ",
    67: "सड़सठ",
    68: "अड़सठ",
    69: "उनहत्तर",
    70: "सत्तर",
    71: "इकहत्तर",
    72: "बहत्तर",
    73: "तिहत्तर",
    74: "चौहत्तर",
    75: "पचहत्तर",
    76: "छिहत्तर",
    77: "सत्तहत्तर",
    78: "अठहत्तर",
    79: "उनासी",
    80: "अस्सी",
    81: "इक्यासी",
    82: "बयासी",
    83: "तिरासी",
    84: "चौरासी",
    85: "पचासी",
    86: "छियासी",
    87: "सत्तासी",
    88: "अठासी",
    89: "नवासी",
    90: "नब्बे",
    91: "इक्यानवे",
    92: "बानवे",
    93: "तिरेनवे",
    94: "चौरानवे",
    95: "पचानवे",
    96: "छियानवे",
    97: "सत्तानवे",
    98: "अट्ठानवे",
    99: "निन्यानवे",
  };

  function numToWords(num) {
    if (num === 0) return "शून्य";
    if (num < 20) return ones[num];
    if (num < 100) return tensSpecial[num];
    if (num < 1000)
      return (
        ones[Math.floor(num / 100)] +
        " सौ" +
        (num % 100 ? " " + numToWords(num % 100) : "")
      );
    if (num < 100000)
      return (
        numToWords(Math.floor(num / 1000)) +
        " हज़ार" +
        (num % 1000 ? " " + numToWords(num % 1000) : "")
      );
    if (num < 10000000)
      return (
        numToWords(Math.floor(num / 100000)) +
        " लाख" +
        (num % 100000 ? " " + numToWords(num % 100000) : "")
      );
    return (
      numToWords(Math.floor(num / 10000000)) +
      " करोड़" +
      (num % 10000000 ? " " + numToWords(num % 10000000) : "")
    );
  }

  return numToWords(Math.floor(amount)) + " रुपये";
}


/* ----------------------------------------------------
   Safe Aadhaar Mask
---------------------------------------------------- */
function maskAadhaar(aadhaar) {
  if (!aadhaar) return "N/A";
  return aadhaar.replace(/.(?=.{4})/g, "X");
}

//----------------------Hindi-Eng With Watermark----------------------------
function buildInvoiceHTML(order, snapshot, application, payment) {
  const scheme = application?.schemeId;
  const property = application?.propertyId;
  const invoiceId = payment?.invoiceId;

  // Main Logo
  const logoPath = path.join(__dirname, "public/aw_logo.png");
  const logoBuffer = fs.readFileSync(logoPath);
  const base64Logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  // UP Govt Watermark
  const watermarkPath = "public/up_karori1234.png";
  const watermarkBuffer = fs.readFileSync(watermarkPath);
  const watermarkBase64 = `data:image/png;base64,${watermarkBuffer.toString(
    "base64"
  )}`;
  const paymentTypeMap = {
    APPLICATION_FEE: "आवेदन शुल्क",
    EMD_FEE: "ईएमडी शुल्क",
  };
    const paymentType = {
      APPLICATION_FEE: "Application Fee",
      EMD_FEE: "Emd Fee",
    };


  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Payment Invoice</title>

<style>
  body {
    font-family: Arial, sans-serif;
    padding: 40px;
    position: relative;
  }

  /* ---------------------- REAL IMAGE WATERMARK ---------------------- */
  .img-watermark {
    position: fixed;
    top: 25%;
    left: 50%;
    width: 350px;
    opacity: 0.08; /* Light transparent */
    transform: translateX(-50%);
    z-index: 0;
  }

  /* Header */
  .header {
    text-align: center;
    border-bottom: 2px solid #003366;
    padding-bottom: 10px;
    z-index: 2;
    position: relative;
  }

  .header img { height: 80px; }

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;      
  margin-top: 15px;
}

td, th {
  width: 50%;              
  border: 1px solid #444;
  padding: 8px 10px;
  font-size: 14px;
  word-wrap: break-word;   
}


  th {
    background: #003366;
    color: #fff;
  }

  .section-title {
    font-weight: bold;
    background: #efefef;
    padding: 8px;
    margin-top: 15px;
    border: 1px solid #ccc;
    font-size: 15px;
  }

  .footer-note {
    text-align: center;
    margin-top: 20px;
    font-size: 12px;
    color: gray;
  }
</style>
</head>

<body>

<!-- Actual Watermark -->
<img src="${watermarkBase64}" class="img-watermark" />

<div class="header">
  <img src="${base64Logo}" />

</div>

<h3 style="text-align:center;margin-top:20px;">
  PAYMENT INVOICE / भुगतान रसीद
</h3>

<div class="section-title">Scheme & Property Details / योजना व संपत्ति विवरण</div>
<table>
  <tr>
    <td><b>Scheme Name / योजना</b></td>
    <td>${scheme?.title}</td>
  </tr>

  ${
    property
      ? `<tr><td><b>Property Preferance Name / संपत्ति</b></td><td>${property?.title}</td></tr>`
      : ""
  }
</table>

<div class="section-title">Applicant Details / आवेदक विवरण</div>
<table>
  <tr>
    <td><b>Name / नाम</b></td>
    <td>${snapshot?.fullName || snapshot?.personalDetails?.name || "N/A"}</td>
  </tr>

  <tr>
    <td><b>Mobile / मोबाइल</b></td>
    <td>${snapshot?.phoneNumber || snapshot?.personalDetails?.mobileNumber}</td>
  </tr>
</table>

<div class="section-title">Invoice Details / रसीद विवरण</div>
<table>
  <tr><td><b>Invoice No / रसीद संख्या</b></td><td>${invoiceId}</td></tr>
  <tr><td><b>Order ID / ऑर्डर आईडी</b></td><td>${order.orderId}</td></tr>
  <tr><td><b>Date / दिनांक</b></td><td>${moment(order.createdAt).format(
    "DD-MM-YYYY HH:mm:ss"
  )}</td></tr>
<tr>
  <td><b>Payment Type / भुगतान प्रकार</b></td>
  <td>
    ${
      order.paymentType
        .replace("_", " ") // replace underscore
        .toLowerCase() // all lower-case
        .replace(/\b\w/g, (c) => c.toUpperCase()) // capitalize EACH word
    }
  </td>
</tr>

  <tr><td><b>Payment Mode / भुगतान मोड</b></td><td>${
    payment.paymentMode.charAt(0).toUpperCase() +
    payment.paymentMode.slice(1).toLowerCase()
  }</td></tr>
  <tr><td><b>Status / स्थिति</b></td><td>${
    order.status.charAt(0).toUpperCase() + order.status.slice(1).toLowerCase()
  }</td></tr>
</table>

<div class="section-title">Payment Summary / भुगतान सारांश</div>
<table>
  <tr><th>Description / विवरण</th><th>Amount / राशि</th></tr>
  <tr>
    <td>
  ${order.paymentType.replace("_", " ")} 
  / ${paymentTypeMap[order.paymentType] || ""}
</td>

    <td>₹${order.amount} ${
    order.paymentType === "APPLICATION_FEE"
      ? ` <small>(inclusive of GST @18%)</small>`
      : ""
  }</td>
  </tr>
  <tr>
    <td><b>Total / कुल</b></td>
    <td><b>₹${order.amount}</b></td>
  </tr>
</table>

<p><b>Amount in Words / राशि शब्दों में:</b>  
   ${convertAmountToWords(order.amount)} / ${convertAmountToHindiWords(
    order.amount
  )}
  मात्र

</p>

<p class="footer-note">
  This is a computer-generated invoice and does not require a signature.<br>
  यह एक कम्प्यूटर द्वारा जनरेटेड रसीद है, हस्ताक्षर आवश्यक नहीं।
</p>

</body>
</html>
`;
}

/* ----------------------------------------------------
   Generate Invoice PDF
---------------------------------------------------- */
export const generatePaymentInvoice = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findOne({ orderId }).lean();
  if (!order) {
    return res.status(404).json({ status: false, message: "Order not found" });
  }

  if (order.status !== "paid") {
    return res.status(400).json({
      status: false,
      message: "Invoice not available. Payment not completed.",
    });
  }
  const payment = await Payment.findOne({ orderId })
    .lean()
    .select("invoiceId paymentMode");
  if (!payment) {
    return res
      .status(404)
      .json({ status: false, message: "Payment record not found" });
  }
  const application = await Application.findById(order.applicationId)
    .populate("schemeId")
    .populate("propertyId")
    .lean();

  const snapshot =
    order.paymentType === "EMD_FEE" && application?.applicantSnapshot
      ? application?.applicantSnapshot
      : await userAuth.findById(order.userId).lean();

  const scheme = application;
  const property =
    order.paymentType === "EMD_FEE" && order.propertyId
      ? await Property.findById(order.propertyId).lean()
      : null;

  const html = buildInvoiceHTML(order, snapshot, application, payment);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=Invoice_${order.orderId}.pdf`
  );
  res.end(pdfBuffer);
});

/* ------------------------------------------------------------------
   Build Full Application PDF HTML (English + Hindi)
-------------------------------------------------------------------*/

function buildApplicationHTML(app) {
  const snap = app.applicantSnapshot;
  const personal = snap?.personalDetails;
  const category = snap?.categoryDetails;
  const bank = snap?.bankDetails;
  const curr = snap?.currentAddress;
  const perm = snap?.permanentAddress;
  const econ = snap?.economicDetails;
  const housing = snap?.housingFamilyDetails; // Added housing variable
  const logoPath = path.join(__dirname, "public/aw_logo.png");
  const logoBuffer = fs.readFileSync(logoPath);
  const base64Logo = `data:image/png;base64,${logoBuffer.toString("base64")}`; // NOTE: Watermark logic is kept as per your original code.

  const watermarkPath = "public/up_karori1234.png";
  const watermarkBuffer = fs.readFileSync(watermarkPath);
  const watermarkBase64 = `data:image/png;base64,${watermarkBuffer.toString(
    "base64"
  )}`;

  return `
<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8" />
<title>Application Report</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family: 'Times New Roman', Times, serif; }

  body {
    width: 210mm;
    min-height: 297mm;
    margin: auto;
    padding: 30px 40px; 
    position: relative;
    background: #fff;
    color: #333; 
    font-size: 11pt; 
  }

  /* Centered watermark */
  .img-watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    width: 450px; 
    opacity: 0.08; 
    transform: translate(-50%, -50%);
    z-index: 0;
    pointer-events: none;
  }

  .header {
    text-align: center;
    border-bottom: 3px solid #003366; 
    padding-bottom: 15px;
    margin-bottom: 20px;
    position: relative;
    z-index: 2;
  }
  .header img { height: 70px; } 

  .title {
    text-align: center;
    color: #333;
    font-size: 18px;
    margin-bottom: 5px;
    position: relative;
    z-index: 2;
    font-weight: bold;
  }
  .subtitle {
    text-align: center;
    color: #666;
    font-size: 14px;
    margin-bottom: 18px;
    position: relative;
    z-index: 2;
  }

  .section {
    background: #003366; 
    color: #fff;
    padding: 8px 15px;
    margin-top: 20px;
    font-size: 15px;
    font-weight: bold;
    position: relative;
    z-index: 2;
    border-radius: 2px; 
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-top: 0;
    font-size: 13px;
    position: relative;
    z-index: 2;
  }
  td, th {
    border: 1px solid #ddd; 
    padding: 10px 12px; 
    word-wrap: break-word;
    line-height: 1.4;
    vertical-align: top;
  }
  th { background: #eef; color:#333; font-weight: bold; } 
  /* Stripe for data rows */
  tr:nth-child(even) td { background-color: #f7f7f7; } 

  /* Styles for Key/Value pair tables */
  .data-table tr td:first-child { 
    width: 40%; 
    font-weight: bold; 
    background: #eef; 
  }
  .data-table tr td:last-child {
    width: 60%;
    background: #fff; 
  }

  .summary-box {
    margin-top: 20px;
    padding: 15px;
    border: 2px solid #003366; 
    background: #eef; 
    font-size: 14px;
    position: relative;
    z-index: 2;
    line-height: 1.6;
  }
  .summary-box b { color: #003366; }

  .footer-note {
    text-align:center;
    margin-top: 40px;
    font-size: 10px;
    color: #888;
    position: relative;
    z-index: 2;
  }

  @media print {
    .img-watermark { opacity: 0.08; width:500px; }
  }
</style>
</head>
<body>

<img src="${watermarkBase64}" class="img-watermark" />

<div class="header">
  <img src="${base64Logo}" />
  <div style="font-size: 24px; color: #003366; font-weight: bold; margin-top: 5px;">UP Housing & Development Board</div>
  <div style="font-size: 16px; color: #555;">उत्तर प्रदेश आवास एवं विकास परिषद</div>
</div>

<div class="title">APPLICATION REPORT</div>
<div class="subtitle">Application ID: ${app.applicationId ?? "N/A"}</div>

<div class="section">1. Scheme & Property Details / योजना व संपत्ति विवरण</div>
<table class="data-table">
  <tr><td>Scheme Name / योजना का नाम</td><td>${
    app.schemeId?.title ?? "N/A"
  }</td></tr>
  <tr><td>Property Preference / संपत्ति का नाम</td><td>${
    app.propertyId?.title ?? "N/A"
  }</td></tr>
  <tr><td>Application Date & Time / आवेदन की तिथि</td><td>${
    app.appliedAt ? moment(app.appliedAt).format("DD-MM-YYYY HH:mm:ss") : "N/A"
  }</td></tr>
</table>

<div class="section">2. Applicant Personal Details / व्यक्तिगत विवरण</div>
<table class="data-table">
  <tr><td>Name / नाम</td><td>${personal?.name ?? "N/A"}</td></tr>
  <tr><td>Mobile / मोबाइल</td><td>${personal?.mobileNumber ?? "N/A"}</td></tr>
  <tr><td>Gender / लिंग</td><td>${personal?.gender ?? "N/A"}</td></tr>
  <tr><td>Age / आयु</td><td>${personal?.age?.toString() ?? "N/A"}</td></tr>
  <tr><td>Aadhaar No. / आधार संख्या</td><td>${
    personal?.aadharNumber ? maskAadhaar(personal.aadharNumber) : "N/A"
  }</td></tr>
  <tr><td>Father/Mother/Husband Name / अभिभावक का नाम</td><td>${
    personal?.fatherMotherHusbandName ?? "N/A"
  }</td></tr>
  <tr><td>Spouse Name / जीवनसाथी का नाम</td><td>${
    personal?.spouseName ?? "N/A"
  }</td></tr>
  <tr><td>Spouse Aadhaar / जीवनसाथी का आधार</td><td>${
    personal?.parentAadharNumber
      ? maskAadhaar(personal.parentAadharNumber)
      : "N/A"
  }</td></tr>
  <tr><td>Applicant Monthly Income / मासिक आय (₹)</td><td>₹${
    category?.applicantMonthlyIncome?.toString() ?? 0
  }</td></tr>
  <tr><td>Email / ईमेल</td><td>${econ?.email ?? "N/A"}</td></tr>
</table>

<div class="section">3. Bank Details (Refund) / बैंक विवरण (रिफंड हेतु)</div>
<table class="data-table">
  <tr><td>Account Number / खाता संख्या</td><td>${
    bank?.refundAccountNumber ?? "N/A"
  }</td></tr>
  <tr><td>IFSC Code / आईएफएससी कोड</td><td>${bank?.ifscCode ?? "N/A"}</td></tr>
  <tr><td>Bank Name / बैंक का नाम</td><td>${bank?.bankName ?? "N/A"}</td></tr>
  <tr><td>Branch Name / शाखा का नाम</td><td>${
    bank?.branchName ?? "N/A"
  }</td></tr>
</table>

<div class="section">4. Address Details / पता विवरण</div>
<table class="data-table">
  <tr><td>Current Address / वर्तमान पता</td><td>${
    [curr?.addressLine1, curr?.city, curr?.state, curr?.pinCode]
      .filter(Boolean)
      .join(", ") || "N/A"
  }</td></tr>
  <tr><td>Permanent Address / स्थायी पता</td><td>${
    [perm?.addressLine1, perm?.city, perm?.state, perm?.pinCode]
      .filter(Boolean)
      .join(", ") || "N/A"
  }</td></tr>
</table>

<div class="section">5. Housing & Economic Details / आवास और आर्थिक विवरण</div>
<table class="data-table">
  <tr><td>Employment Status / रोज़गार की स्थिति</td><td>${
    econ?.employmentStatus ?? "N/A"
  }</td></tr>
  <tr><td>BPL Card Holder / बीपीएल कार्ड धारक</td><td>${
    econ?.bplCard ?? "No"
  }</td></tr>
  <tr><td>BPL Card Number / बीपीएल कार्ड संख्या</td><td>${
    econ?.bplCardNumber ?? "N/A"
  }</td></tr>
  <tr><td>Existing House Ownership / मौजूदा मकान का स्वामित्व</td><td>${
    housing?.existingHouseOwnership ?? "N/A"
  }</td></tr>
  <tr><td>Owned House Address (if any) / स्वामित्व वाले मकान का पता</td><td>${
    [housing?.ownLocality, housing?.ownCity, housing?.ownState]
      .filter(Boolean)
      .join(", ") || "N/A"
  }</td></tr>
</table>

<div class="section">6. Payment Records / भुगतान रिकॉर्ड</div>
<table>
  <tr><th>Fee Type / शुल्क प्रकार</th><th>Amount / राशि (₹)</th><th>Status / स्थिति</th><th>Date / दिनांक</th></tr>
  ${
    app.paymentHistory
      ?.map(
        (p) => `
      <tr>
        <td>${p.type?.replace("_", " ") ?? "N/A"}</td>
        <td>₹${p.amount ?? 0}</td>
        <td>${p.status?.toUpperCase() ?? "N/A"}</td>
        <td>${
          p.createdAt
            ? moment(p.createdAt).format("DD-MM-YYYY HH:mm:ss")
            : "N/A"
        }</td>
      </tr>
  `
      )
      .join("") ??
    `<tr><td colspan="4" style="text-align:center;">No Payment History Found</td></tr>`
  }
</table>

<div class="section">7. Final Summary & Status / अंतिम सारांश और स्थिति</div>
<table class="data-table">
  <tr><td>Application Fee Paid / आवेदन शुल्क भुगतान</td><td>${
    app.applicationFeePaid ? "Yes" : "No"
  }</td></tr>
  <tr><td>Application Fee Amount / आवेदन शुल्क राशि</td><td>₹${
    app.applicationFeePaidAmount ?? 0
  }</td></tr>
  <tr><td>EMD Paid / ईएमडी भुगतान</td><td>${
    app.emdFeePaid ? "Yes" : "No"
  }</td></tr>
  <tr><td>EMD Fee Amount / ईएमडी राशि</td><td>₹${
    app.emdFeePaidAmount ?? 0
  }</td></tr>
  <tr><td>Overall Payment Status / कुल भुगतान स्थिति</td><td>${
    app.paymentStatus?.toUpperCase() ?? "N/A"
  }</td></tr>
  <tr><td>Application Status / आवेदन स्थिति</td><td>${
    app.applicationStatus ?? "N/A"
  }</td></tr>
  <tr><td>Allotment Status / आवंटन स्थिति</td><td>${
    app.allotedStatus ?? "N/A"
  }</td></tr>
</table>

<div class="summary-box">
  <p><b>Total EMD Amount / कुल ईएमडी राशि:</b> ₹${app.emdFeePaidAmount ?? 0}</p>
  <p><b>Amount in Words (English):</b> ${convertAmountToWords(
    app.emdFeePaidAmount ?? 0
  )}</p>
  <p><b>राशि शब्दों में (Hindi):</b> ${convertAmountToHindiWords(
    app.emdFeePaidAmount ?? 0
  )} मात्र</p>
</div>

<p class="footer-note">
  This document is system generated and valid for official use. No physical signature required.
  यह दस्तावेज़ कम्प्यूटर द्वारा जनरेट किया गया है और आधिकारिक उपयोग के लिए मान्य है। हस्ताक्षर की आवश्यकता नहीं है।
</p>

</body>
</html>
`;
}

/* --- PDF Route Handler --- */
export const generateApplicationPDF = asyncHandler(
  async (req, res) => {
    const { applicationId } = req.params;
    const appData = await Application.findById(applicationId).lean();

    if (!appData) {
      res
        .status(404)
        .json({ success: false, message: "Application not found" });
      return;
    }

    const html = buildApplicationHTML(appData);

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "15mm", left: "10mm", right: "10mm" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${appData.applicationId}.pdf`
    );
    res.end(pdfBuffer);
  }
);