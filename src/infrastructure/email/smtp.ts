import "server-only";
import nodemailer from "nodemailer";

type EmailInput = Readonly<{ to: string; subject: string; text: string }>;

function safeSmtpErrorResponse(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const safe = value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .slice(0, 300);
  return safe || undefined;
}

export async function sendEmail({ to, subject, text }: EmailInput): Promise<boolean> {
  const user = process.env.GMAIL_SMTP_USER?.trim();
  const appPassword = process.env.GMAIL_SMTP_APP_PASSWORD?.replace(/\s/g, "");
  if (!user || !appPassword) {
    console.error("Gmail SMTP delivery is disabled. Configure GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass: appPassword },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  try {
    await transporter.sendMail({
      from: { name: "StayPilot", address: user },
      to,
      subject,
      text,
    });
    return true;
  } catch (error) {
    const smtpError = error as { code?: unknown; responseCode?: unknown; command?: unknown; response?: unknown };
    console.error("Gmail SMTP rejected an email request.", {
      errorCode: typeof smtpError.code === "string" ? smtpError.code : "unknown_error",
      ...(typeof smtpError.responseCode === "number" ? { responseCode: smtpError.responseCode } : {}),
      ...(typeof smtpError.command === "string" ? { command: smtpError.command } : {}),
      ...(safeSmtpErrorResponse(smtpError.response) ? { response: safeSmtpErrorResponse(smtpError.response) } : {}),
    });
    return false;
  } finally {
    transporter.close();
  }
}
