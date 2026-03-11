import nodemailer from "nodemailer";

export const sendMailReport = async (
  emails,
  subject,
  htmlContent,
  ccEmails = [],
  bccEmails = [],
  attachments = []
) => {
  const { ZEPTOMAIL_USER, ZEPTOMAIL_PASS, MAIL_NAME, MAIL_EMAIL } = process.env;

  const transporter = nodemailer.createTransport({
    host: "smtp.zeptomail.in",
    port: 465,
    secure: true,
    auth: {
      user: ZEPTOMAIL_USER,
      pass: ZEPTOMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.IS_SSL ==="true", // bypass self-signed cert error
    },
  });

  const mailOptions = {
    from: `"${MAIL_NAME}" <${MAIL_EMAIL}>`,
    to: Array.isArray(emails) ? emails.join(",") : emails, // multiple recipients
    cc:
      Array.isArray(ccEmails) && ccEmails.length
        ? ccEmails.join(",")
        : undefined, // optional
    bcc:
      Array.isArray(bccEmails) && bccEmails.length
        ? bccEmails.join(",")
        : undefined, // optional
    subject,
    html: htmlContent,
    attachments,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully");
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return false;
  }
};



const sendMail = async (emails, subject, mailContent) => {
    const { ZEPTOMAIL_USER, ZEPTOMAIL_PASS, MAIL_NAME, MAIL_EMAIL } =
        process.env;

    const transporter = nodemailer.createTransport({
      host: "smtp.zeptomail.in",
      port: 465,
      secure: true,
      auth: {
        user: ZEPTOMAIL_USER,
        pass: ZEPTOMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.IS_SSL === "true", // <-- bypass self-signed cert error
      },
    });
    const mailOptions = {
        from: `"${MAIL_NAME}" <${MAIL_EMAIL}>`,
        to: emails,
        subject: subject,
        html: mailContent,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Error sending email with Zoho:", error);
        return false;
    }
};

export default sendMail;
