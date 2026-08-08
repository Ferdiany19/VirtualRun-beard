import net from "node:net";
import tls from "node:tls";
import os from "node:os";
import crypto from "node:crypto";
import { env } from "@/shared/config/env";
import { ApplicationError } from "@/shared/errors/application-error";
import { logger } from "@/shared/logging/logger";

export type RegistrationEmailInput = {
  to: string;
  participantName: string;
  eventName: string;
  registrationCode: string;
  bibNumber: string;
  categories: string[];
  eventPeriod: string;
  participantAccessUrl: string;
  bibStatus: string;
  contact: string;
  bibAttachment?: EmailAttachment | null;
};

export type SubmissionValidationEmailInput = {
  to: string;
  participantName: string;
  eventName: string;
  categoryName: string;
  status: string;
  participantVisibleNote: string | null;
  participantAccessUrl: string;
  contact: string;
};

type EmailAttachment = {
  filename: string;
  contentType: string;
  content: Buffer;
};

function buildRegistrationEmail(input: RegistrationEmailInput): { subject: string; body: string } {
  return {
    subject: `Konfirmasi pendaftaran ${input.eventName}`,
    body: [
      `Halo ${input.participantName},`,
      "",
      `Pendaftaran Anda untuk ${input.eventName} sudah tercatat.`,
      `Registration code: ${input.registrationCode}`,
      `BIB: ${input.bibNumber}`,
      `Kategori: ${input.categories.join(", ")}`,
      `Periode event: ${input.eventPeriod}`,
      `Status BIB: ${input.bibStatus}`,
      "",
      `Akses peserta: ${input.participantAccessUrl}`,
      `Kontak organizer: ${input.contact}`,
      "",
      "Simpan registration code ini dan jangan bagikan kepada orang lain.",
    ].join("\n"),
  };
}

type SmtpSocket = net.Socket | tls.TLSSocket;

function readSmtpReply(socket: SmtpSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter((line) => line.length > 0);

      if (lines.some((line) => /^\d{3} /.test(line))) {
        cleanup();
        resolve(buffer);
      }
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };

    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function expectSmtp(socket: SmtpSocket, expectedPrefix: string): Promise<string> {
  const line = await readSmtpReply(socket);

  if (!line.startsWith(expectedPrefix)) {
    throw new Error(`Unexpected SMTP response: ${line.trim()}`);
  }

  return line;
}

function writeSmtp(socket: SmtpSocket, command: string): void {
  socket.write(`${command}\r\n`);
}

async function connectSmtp(): Promise<SmtpSocket> {
  if (!env.SMTP_HOST) {
    throw new ApplicationError({
      code: "CONFIGURATION_MISSING",
      message: "SMTP host is missing",
      safeMessage: "Konfigurasi email belum lengkap.",
      statusCode: 500,
    });
  }

  const socket =
    env.SMTP_PORT === 465
      ? tls.connect({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          servername: env.SMTP_HOST,
        })
      : net.connect(env.SMTP_PORT, env.SMTP_HOST);
  socket.setTimeout(30_000, () => {
    socket.destroy(new Error("SMTP connection timed out"));
  });

  await new Promise<void>((resolve, reject) => {
    const eventName = socket instanceof tls.TLSSocket ? "secureConnect" : "connect";
    socket.once(eventName, () => resolve());
    socket.once("error", reject);
  });
  await expectSmtp(socket, "220");
  writeSmtp(socket, "EHLO virtual-run-beard");
  await expectSmtp(socket, "250");

  if (!(socket instanceof tls.TLSSocket)) {
    writeSmtp(socket, "STARTTLS");
    await expectSmtp(socket, "220");
    const secureSocket = tls.connect({
      socket,
      servername: env.SMTP_HOST,
    });
    await new Promise<void>((resolve, reject) => {
      secureSocket.once("secureConnect", () => resolve());
      secureSocket.once("error", reject);
    });
    writeSmtp(secureSocket, "EHLO virtual-run-beard");
    await expectSmtp(secureSocket, "250");
    return secureSocket;
  }

  return socket;
}

function encodeBase64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function smtpPasswordForAuth(): string {
  const password = env.SMTP_PASSWORD ?? "";

  if (env.SMTP_HOST?.toLowerCase() === "smtp.gmail.com") {
    return password.replace(/\s+/g, "");
  }

  return password;
}

function escapeData(value: string): string {
  return value.replace(/^\./gm, "..");
}

function chunkBase64(value: Buffer): string {
  return value
    .toString("base64")
    .replace(/.{1,76}/g, (chunk) => `${chunk}\r\n`)
    .trimEnd();
}

function encodeHeader(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) {
    return value;
  }

  return `=?UTF-8?B?${encodeBase64(value)}?=`;
}

function buildMessageId(): string {
  const random = crypto.randomUUID();
  const hostname = os.hostname().replace(/[^a-zA-Z0-9.-]/g, "");
  return `<${random}@${hostname || "virtual-run-beard.local"}>`;
}

async function sendRawSmtpEmail(input: {
  to: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
}): Promise<void> {
  if (!env.SMTP_USERNAME || !env.SMTP_PASSWORD || !env.SMTP_FROM_EMAIL) {
    throw new ApplicationError({
      code: "CONFIGURATION_MISSING",
      message: "SMTP credentials are missing",
      safeMessage: "Konfigurasi email belum lengkap.",
      statusCode: 500,
    });
  }

  const socket = await connectSmtp();

  try {
    writeSmtp(socket, "AUTH LOGIN");
    await expectSmtp(socket, "334");
    writeSmtp(socket, encodeBase64(env.SMTP_USERNAME));
    await expectSmtp(socket, "334");
    writeSmtp(socket, encodeBase64(smtpPasswordForAuth()));
    await expectSmtp(socket, "235");
    writeSmtp(socket, `MAIL FROM:<${env.SMTP_FROM_EMAIL}>`);
    await expectSmtp(socket, "250");
    writeSmtp(socket, `RCPT TO:<${input.to}>`);
    await expectSmtp(socket, "250");
    writeSmtp(socket, "DATA");
    await expectSmtp(socket, "354");
    writeSmtp(socket, `${buildMimeMessage(input)}\r\n.`);
    await expectSmtp(socket, "250");
    writeSmtp(socket, "QUIT");
  } finally {
    socket.end();
  }
}

function sanitizeAttachmentFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "attachment";
}

function buildMimeMessage(input: {
  to: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
}): string {
  const attachments = input.attachments ?? [];
  const headers = [
    `From: VirtualRun <${env.SMTP_FROM_EMAIL}>`,
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${buildMessageId()}`,
    "MIME-Version: 1.0",
  ];

  if (attachments.length === 0) {
    return [
      ...headers,
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      escapeData(input.body),
    ].join("\r\n");
  }

  const boundary = `vrb-${crypto.randomUUID()}`;
  const parts = [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    escapeData(input.body),
  ];

  for (const attachment of attachments) {
    const filename = sanitizeAttachmentFilename(attachment.filename);
    parts.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      chunkBase64(attachment.content),
    );
  }

  parts.push(`--${boundary}--`);
  return parts.join("\r\n");
}

async function sendSmtpEmail(input: RegistrationEmailInput): Promise<void> {
  const message = buildRegistrationEmail(input);
  await sendRawSmtpEmail({
    to: input.to,
    subject: message.subject,
    body: message.body,
    attachments: input.bibAttachment ? [input.bibAttachment] : [],
  });
}

export async function sendRegistrationConfirmationEmail(
  input: RegistrationEmailInput,
): Promise<void> {
  if (env.EMAIL_DRIVER === "smtp") {
    await sendSmtpEmail(input);
    return;
  }

  logger.info("Registration confirmation email prepared", {
    eventName: input.eventName,
    bibStatus: input.bibStatus,
    categoryCount: input.categories.length,
  });
}

function buildSubmissionValidationEmail(input: SubmissionValidationEmailInput): {
  subject: string;
  body: string;
} {
  return {
    subject: `Status hasil ${input.eventName}: ${input.status}`,
    body: [
      `Halo ${input.participantName},`,
      "",
      `Status hasil Anda untuk ${input.eventName} kategori ${input.categoryName}: ${input.status}.`,
      input.participantVisibleNote ? `Catatan: ${input.participantVisibleNote}` : null,
      "",
      `Akses peserta: ${input.participantAccessUrl}`,
      `Kontak organizer: ${input.contact}`,
      "",
      "Email ini tidak memuat catatan internal validator atau tautan file bukti permanen.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export async function sendSubmissionValidationEmail(
  input: SubmissionValidationEmailInput,
): Promise<void> {
  if (env.EMAIL_DRIVER === "smtp") {
    const message = buildSubmissionValidationEmail(input);
    await sendRawSmtpEmail({ to: input.to, subject: message.subject, body: message.body });
    return;
  }

  logger.info("Submission validation email prepared", {
    eventName: input.eventName,
    categoryName: input.categoryName,
    status: input.status,
  });
}
