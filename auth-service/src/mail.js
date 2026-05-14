import nodemailer from "nodemailer";

let transporter;

export function getMailer() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  } else {
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  const mail = getMailer();
  const info = await mail.sendMail({
    from: process.env.MAIL_FROM || "FoodBridge <noreply@foodbridge.local>",
    to,
    subject,
    text,
    html,
  });
  if (info.message) {
    console.log("[mail]", subject, "->", to, info.message);
  }
  return info;
}
