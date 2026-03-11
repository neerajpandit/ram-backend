import fs from "fs";
import path from "path";
import moment from "moment";

function buildMemberFormHTML1(member) {
  // Main Logo
  const logoPath = path.join(process.cwd(), "public/logo_ram.png");
  const logoBuffer = fs.readFileSync(logoPath);
  const base64Logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  // Watermark
  const watermarkPath = path.join(process.cwd(), "public/ram.jpg");
  const watermarkBuffer = fs.readFileSync(watermarkPath);
  const watermarkBase64 = `data:image/png;base64,${watermarkBuffer.toString("base64")}`;
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Member Registration Form</title>

<style>

body{
font-family: Arial, sans-serif;
padding:40px;
position:relative;
}

.text-watermark{
position:fixed;
top:50%;
left:50%;
transform:translate(-50%,-50%) rotate(-30deg);
font-size:80px;
color:#000;
opacity:0.06;
font-weight:bold;
white-space:nowrap;
z-index:0;
pointer-events:none;
}

/* Header */

.header{
text-align:center;
border-bottom:2px solid #003366;
padding-bottom:10px;
position:relative;
z-index:2;
}

.header img{
height:80px;
}

h3{
text-align:center;
margin-top:20px;
}

table{
width:100%;
border-collapse:collapse;
table-layout:fixed;
margin-top:15px;
}

td,th{
border:1px solid #444;
padding:8px 10px;
font-size:14px;
word-wrap:break-word;
}

th{
background:#003366;
color:#fff;
}

.section-title{
font-weight:bold;
background:#efefef;
padding:8px;
margin-top:20px;
border:1px solid #ccc;
font-size:15px;
}

.footer-note{
text-align:center;
margin-top:30px;
font-size:12px;
color:gray;
}

</style>

</head>

<body>

<div class="text-watermark">
राष्ट्रीय अधिकार मोर्चा
</div>

<div class="header">
<img src="${base64Logo}" />
</div>

<h3>
MEMBER REGISTRATION FORM / सदस्य पंजीकरण प्रपत्र
</h3>


<div class="section-title">Basic Details / मूल विवरण</div>

<table>

<tr>
<td><b>Form Number / फॉर्म नंबर</b></td>
<td>${member.formNumber || "-"}</td>
</tr>

<tr>
<td><b>Name / नाम</b></td>
<td>${member.name || "-"}</td>
</tr>

<tr>
<td><b>Father / Husband Name / पिता या पति का नाम</b></td>
<td>${member.fatherOrHusbandName || "-"}</td>
</tr>

<tr>
<td><b>Age / आयु</b></td>
<td>${member.age || "-"}</td>
</tr>

<tr>
<td><b>Mobile / मोबाइल</b></td>
<td>${member.phoneNumber || "-"}</td>
</tr>

<tr>
<td><b>Voter ID / वोटर आईडी</b></td>
<td>${member.voterId || "-"}</td>
</tr>

</table>


<div class="section-title">Address Details / पता विवरण</div>

<table>

<tr>
<td><b>Address / पता</b></td>
<td>${member.address || "-"}</td>
</tr>

<tr>
<td><b>District / जिला</b></td>
<td>${member.district || "-"}</td>
</tr>

<tr>
<td><b>State / राज्य</b></td>
<td>${member.state || "-"}</td>
</tr>

<tr>
<td><b>Pin Code / पिन कोड</b></td>
<td>${member.pinCode || "-"}</td>
</tr>

</table>


<div class="section-title">Political Details / राजनीतिक विवरण</div>

<table>

<tr>
<td><b>Constituency / विधानसभा क्षेत्र</b></td>
<td>${member.constituency || "-"}</td>
</tr>

<tr>
<td><b>Polling Station / मतदान केंद्र</b></td>
<td>${member.pollingStation || "-"}</td>
</tr>

<tr>
<td><b>Location / स्थान</b></td>
<td>${member.location || "-"}</td>
</tr>

<tr>
<td><b>Form Date / फॉर्म तिथि</b></td>
<td>${
  member.formDate
    ? moment(member.formDate).format("DD-MM-YYYY")
    : "-"
}</td>
</tr>

<tr>
<td><b>Status / स्थिति</b></td>
<td>${member.status}</td>
</tr>

</table>


<p class="footer-note">
This is a computer-generated form and does not require a signature.<br>
यह एक कंप्यूटर द्वारा जनरेट किया गया फॉर्म है।
</p>

</body>
</html>
`;



//   return `
// <!DOCTYPE html>
// <html>
// <head>
// <meta charset="UTF-8"/>
// <title>Member Form</title>

// <style>

// body{
// font-family: Arial;
// padding:40px;
// }

// .img-watermark{
// position:fixed;
// top:25%;
// left:50%;
// width:350px;
// opacity:0.08;
// transform:translateX(-50%);
// z-index:0;
// }

// .header{
// text-align:center;
// border-bottom:2px solid #003366;
// padding-bottom:10px;
// }

// .header img{
// height:80px;
// }

// table{
// width:100%;
// border-collapse:collapse;
// margin-top:20px;
// }

// td,th{
// border:1px solid #444;
// padding:8px 10px;
// font-size:14px;
// }

// th{
// background:#003366;
// color:#fff;
// }

// .section-title{
// font-weight:bold;
// background:#efefef;
// padding:8px;
// margin-top:20px;
// border:1px solid #ccc;
// }

// </style>

// </head>

// <body>

// <img src="${watermarkBase64}" class="img-watermark"/>

// <div class="header">
// <img src="${base64Logo}" />
// </div>

// <h3 style="text-align:center;margin-top:20px;">
// MEMBER REGISTRATION FORM / सदस्य पंजीकरण प्रपत्र
// </h3>

// <div class="section-title">Basic Details / मूल विवरण</div>

// <table>

// <tr>
// <td><b>Form Number / फॉर्म नंबर</b></td>
// <td>${member.formNumber || "N/A"}</td>
// </tr>

// <tr>
// <td><b>Name / नाम</b></td>
// <td>${member.name}</td>
// </tr>

// <tr>
// <td><b>Father / Husband Name / पिता या पति का नाम</b></td>
// <td>${member.fatherOrHusbandName || "-"}</td>
// </tr>

// <tr>
// <td><b>Age / आयु</b></td>
// <td>${member.age || "-"}</td>
// </tr>

// <tr>
// <td><b>Mobile Number / मोबाइल</b></td>
// <td>${member.phoneNumber}</td>
// </tr>

// <tr>
// <td><b>Voter ID / वोटर आईडी</b></td>
// <td>${member.voterId || "-"}</td>
// </tr>

// </table>


// <div class="section-title">Address Details / पता विवरण</div>

// <table>

// <tr>
// <td><b>Address / पता</b></td>
// <td>${member.address || "-"}</td>
// </tr>

// <tr>
// <td><b>District / जिला</b></td>
// <td>${member.district || "-"}</td>
// </tr>

// <tr>
// <td><b>State / राज्य</b></td>
// <td>${member.state || "-"}</td>
// </tr>

// <tr>
// <td><b>Pin Code / पिन कोड</b></td>
// <td>${member.pinCode || "-"}</td>
// </tr>

// </table>


// <div class="section-title">Political Details / राजनीतिक विवरण</div>

// <table>

// <tr>
// <td><b>Constituency / विधानसभा क्षेत्र</b></td>
// <td>${member.constituency || "-"}</td>
// </tr>

// <tr>
// <td><b>Polling Station / मतदान केंद्र</b></td>
// <td>${member.pollingStation || "-"}</td>
// </tr>

// <tr>
// <td><b>Location / स्थान</b></td>
// <td>${member.location || "-"}</td>
// </tr>

// <tr>
// <td><b>Form Date / फॉर्म तिथि</b></td>
// <td>${member.formDate ? moment(member.formDate).format("DD-MM-YYYY") : "-"}</td>
// </tr>

// <tr>
// <td><b>Status / स्थिति</b></td>
// <td>${member.status}</td>
// </tr>

// </table>

// <p style="text-align:center;margin-top:30px;font-size:12px;color:gray;">
// This is a computer generated form.<br>
// यह एक कंप्यूटर द्वारा जनरेट किया गया फॉर्म है।
// </p>

// </body>
// </html>
// `;
}

function buildMemberFormHTML2(member) {
  // Main Logo
  const logoPath = path.join(process.cwd(), "public/logo_ram.png");
  const logoBuffer = fs.readFileSync(logoPath);
  const base64Logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  // Watermark
  const watermarkPath = path.join(process.cwd(), "public/ram.jpg");
  const watermarkBuffer = fs.readFileSync(watermarkPath);
  const watermarkBase64 = `data:image/png;base64,${watermarkBuffer.toString("base64")}`;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Member Registration Form</title>

<style>

body{
font-family: Arial, sans-serif;
padding:40px;
position:relative;
}

.text-watermark{
position:fixed;
top:50%;
left:50%;
transform:translate(-50%,-50%) rotate(-30deg);
font-size:80px;
color:#000;
opacity:0.06;
font-weight:bold;
white-space:nowrap;
z-index:0;
pointer-events:none;
}

/* Header */

.header{
text-align:center;
border-bottom:2px solid #003366;
padding-bottom:10px;
position:relative;
z-index:2;
}

.header img{
height:80px;
}

h3{
text-align:center;
margin-top:20px;
}

table{
width:100%;
border-collapse:collapse;
table-layout:fixed;
margin-top:15px;
}

td,th{
border:1px solid #444;
padding:8px 10px;
font-size:14px;
word-wrap:break-word;
}

th{
background:#003366;
color:#fff;
}

.section-title{
font-weight:bold;
background:#efefef;
padding:8px;
margin-top:20px;
border:1px solid #ccc;
font-size:15px;
}

.declaration{
margin-top:10px;
border:1px solid #444;
padding:12px;
font-size:14px;
line-height:1.6;
background:#fafafa;
}

.footer-note{
text-align:center;
margin-top:30px;
font-size:12px;
color:gray;
}

</style>

</head>

<body>

<div class="text-watermark">
राष्ट्रीय अधिकार मोर्चा
</div>

<div class="header">
<img src="${base64Logo}" />
</div>

<h3>
MEMBER REGISTRATION FORM / सदस्य पंजीकरण प्रपत्र
</h3>

<div class="section-title">Basic Details / मूल विवरण</div>

<table>

<tr>
<td><b>Form Number / फॉर्म नंबर</b></td>
<td>${member.formNumber || "-"}</td>
</tr>

<tr>
<td><b>Name / नाम</b></td>
<td>${member.name || "-"}</td>
</tr>

<tr>
<td><b>Father / Husband Name / पिता या पति का नाम</b></td>
<td>${member.fatherOrHusbandName || "-"}</td>
</tr>

<tr>
<td><b>Age / आयु</b></td>
<td>${member.age || "-"}</td>
</tr>

<tr>
<td><b>Mobile / मोबाइल</b></td>
<td>${member.phoneNumber || "-"}</td>
</tr>

<tr>
<td><b>Voter ID / वोटर आईडी</b></td>
<td>${member.voterId || "-"}</td>
</tr>

</table>

<div class="section-title">Address Details / पता विवरण</div>

<table>

<tr>
<td><b>Address / पता</b></td>
<td>${member.address || "-"}</td>
</tr>

<tr>
<td><b>District / जिला</b></td>
<td>${member.district || "-"}</td>
</tr>

<tr>
<td><b>State / राज्य</b></td>
<td>${member.state || "-"}</td>
</tr>

<tr>
<td><b>Pin Code / पिन कोड</b></td>
<td>${member.pinCode || "-"}</td>
</tr>

</table>

<div class="section-title">Political Details / राजनीतिक विवरण</div>

<table>

<tr>
<td><b>Constituency / विधानसभा क्षेत्र</b></td>
<td>${member.constituency || "-"}</td>
</tr>

<tr>
<td><b>Polling Station / मतदान केंद्र</b></td>
<td>${member.pollingStation || "-"}</td>
</tr>

<tr>
<td><b>Location / स्थान</b></td>
<td>${member.location || "-"}</td>
</tr>

<tr>
<td><b>Form Date / फॉर्म तिथि</b></td>
<td>${member.formDate ? moment(member.formDate).format("DD-MM-YYYY") : "-"}</td>
</tr>

<tr>
<td><b>Status / स्थिति</b></td>
<td>${member.status || "-"}</td>
</tr>

</table>

<div class="section-title">Declaration / घोषणा</div>

<div class="declaration">

मैं भारत के संविधान में सच्ची निष्ठा रखता/रखती हूँ एवं 
राष्ट्रीय अधिकार मोर्चा (R.A.M.) के उद्देश्यों से प्रभावित होकर 
उसके संविधान में आस्था रखते हुए संगठन का सदस्य बनना चाहता/चाहती हूँ। 
मेरी आयु 18 वर्ष से अधिक है।

<br><br>

मैं मेरा सदस्यता आवेदन स्वीकार होने के उपरांत 
वार्षिक सदस्यता शुल्क ₹10/- (दस रुपये मात्र) के अनुसार 
मार्च 2026 से फरवरी 2029 तक की अवधि के लिए जमा करूंगा/करूंगी।

</div>

<p class="footer-note">
This is a computer-generated form and does not require a signature.<br>
यह एक कंप्यूटर द्वारा जनरेट किया गया फॉर्म है।
</p>

</body>
</html>
`;
}

function buildMemberFormHTML(member) {
  const logoPath = path.join(process.cwd(), "public/logo_ram.png");
  const logoBuffer = fs.readFileSync(logoPath);
  const base64Logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  const watermarkPath = path.join(process.cwd(), "public/ram.jpg");
  const watermarkBuffer = fs.readFileSync(watermarkPath);
  const watermarkBase64 = `data:image/png;base64,${watermarkBuffer.toString("base64")}`;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Member Registration Form</title>

<style>

body{
font-family: Arial, sans-serif;
padding:25px;
position:relative;
font-size:13px;
}

/* Watermark */

.text-watermark{
position:fixed;
top:50%;
left:50%;
transform:translate(-50%,-50%) rotate(-30deg);
font-size:70px;
color:#000;
opacity:0.05;
font-weight:bold;
white-space:nowrap;
z-index:0;
pointer-events:none;
}

/* Header */

.header{
text-align:center;
border-bottom:2px solid #003366;
padding-bottom:5px;
margin-bottom:10px;
position:relative;
z-index:2;
}

.header img{
height:70px;
}

.header-title{
font-size:18px;
font-weight:bold;
margin-top:5px;
}

h3{
text-align:center;
margin:10px 0;
font-size:16px;
}

/* Tables */

table{
width:100%;
border-collapse:collapse;
table-layout:fixed;
margin-top:10px;
}

td,th{
border:1px solid #444;
padding:6px 8px;
font-size:12px;
word-wrap:break-word;
}

th{
background:#003366;
color:#fff;
}

.section-title{
font-weight:bold;
background:#efefef;
padding:6px;
margin-top:12px;
border:1px solid #ccc;
font-size:13px;
}

/* Declaration */

.declaration{
margin-top:8px;
border:1px solid #444;
padding:8px;
font-size:12px;
line-height:1.4;
background:#fafafa;
}

/* Footer */

.footer-note{
text-align:center;
margin-top:15px;
font-size:11px;
color:gray;
}

</style>

</head>

<body>

<div class="text-watermark">
राष्ट्रीय अधिकार मोर्चा
</div>

<div class="header">
<img src="${base64Logo}" />
<div class="header-title">राष्ट्रीय अधिकार मोर्चा (RAM)</div>
</div>

<h3>
MEMBER REGISTRATION FORM / सदस्य पंजीकरण प्रपत्र
</h3>

<div class="section-title">Prakoshth</div>
<table>
<tr>
<td><b>Name</b></td>
<td>${member.prakoshth.nameEn || "-"} / ${member.prakoshth.nameHi || "-"}</td>
</tr>
</table>

<div class="section-title">Basic Details / मूल विवरण</div>

<table>

<tr>
<td><b>Form Number / फॉर्म नंबर</b></td>
<td>${member.formNumber || "-"}</td>
</tr>

<tr>
<td><b>Name / नाम</b></td>
<td>${member.name || "-"}</td>
</tr>

<tr>
<td><b>Father / Husband Name / पिता या पति का नाम</b></td>
<td>${member.fatherOrHusbandName || "-"}</td>
</tr>

<tr>
<td><b>Age / आयु</b></td>
<td>${member.age || "-"}</td>
</tr>

<tr>
<td><b>Mobile / मोबाइल</b></td>
<td>${member.phoneNumber || "-"}</td>
</tr>

<tr>
<td><b>Voter ID / वोटर आईडी</b></td>
<td>${member.voterId || "-"}</td>
</tr>

</table>

<div class="section-title">Address Details / पता विवरण</div>

<table>

<tr>
<td><b>Address / पता</b></td>
<td>${member.address || "-"}</td>
</tr>

<tr>
<td><b>District / जिला</b></td>
<td>${member.district.nameEn || "-"}</td>
</tr>

<tr>
<td><b>State / राज्य</b></td>
<td>${member.state.nameEn || "-"}</td>
</tr>

<tr>
<td><b>Pin Code / पिन कोड</b></td>
<td>${member.pinCode || "-"}</td>
</tr>

</table>

<div class="section-title">Political Details / राजनीतिक विवरण</div>

<table>

<tr>
<td><b>Constituency / विधानसभा क्षेत्र</b></td>
<td>${member.constituency || "-"}</td>
</tr>

<tr>
<td><b>Polling Station / मतदान केंद्र</b></td>
<td>${member.pollingStation || "-"}</td>
</tr>

<tr>
<td><b>Location / स्थान</b></td>
<td>${member.location || "-"}</td>
</tr>

<tr>
<td><b>Form Date / फॉर्म तिथि</b></td>
<td>${member.formDate ? moment(member.formDate).format("DD-MM-YYYY") : "-"}</td>
</tr>

<tr>
<td><b>Status / स्थिति</b></td>
<td>${member.status || "-"}</td>
</tr>

</table>



<div class="section-title">Declaration / घोषणा</div>

<div class="declaration">

मैं भारत के संविधान में सच्ची निष्ठा रखता/रखती हूँ एवं राष्ट्रीय अधिकार मोर्चा (R.A.M.) के उद्देश्यों से प्रभावित होकर उसके संविधान में आस्था रखते हुए संगठन का सदस्य बनना चाहता/चाहती हूँ। मेरी आयु 18 वर्ष से अधिक है।

<br><br>

मैं मेरा सदस्यता आवेदन स्वीकार होने के उपरांत वार्षिक सदस्यता शुल्क ₹10/- (दस रुपये मात्र) के अनुसार मार्च 2026 से फरवरी 2029 तक की अवधि के लिए जमा करूंगा/करूंगी।

</div>

<p class="footer-note">
This is a computer-generated form and does not require a signature.<br>
यह एक कंप्यूटर द्वारा जनरेट किया गया फॉर्म है।
</p>

</body>
</html>
`;
}

import puppeteer from "puppeteer";
import { Member } from "../models/member.Model.js";


export const downloadMemberForm = async (req, res) => {
  const { memberId } = req.params;

  const member = await Member.findById(memberId)
    .populate("prakoshth")
    .populate("state")
    .populate("district")
    .lean();
console.log("member",member);

  if (!member) {
    return res.status(404).json({
      status: false,
      message: "Member not found",
    });
  }

  const html = buildMemberFormHTML(member);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=MemberForm_${member.formNumber}.pdf`,
  );

  res.end(pdfBuffer);
};