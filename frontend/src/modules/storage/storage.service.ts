import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/shared/config/env";
import { ApplicationError } from "@/shared/errors/application-error";

type StoragePutInput = {
  objectKey: string;
  body: Buffer;
  contentType: string;
};

type SignedRequest = {
  url: string;
  headers: Headers;
};

function assertSafeObjectKey(objectKey: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_.,=-]*$/.test(objectKey) || objectKey.includes("..")) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: "Unsafe storage object key",
      safeMessage: "Path file tidak valid.",
      statusCode: 400,
    });
  }
}

function localPathFor(objectKey: string): string {
  assertSafeObjectKey(objectKey);
  return path.join(process.cwd(), env.LOCAL_STORAGE_ROOT, objectKey);
}

async function putLocal(input: StoragePutInput): Promise<void> {
  const targetPath = localPathFor(input.objectKey);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, input.body);
}

async function getLocal(objectKey: string): Promise<Buffer> {
  return readFile(localPathFor(objectKey));
}

async function deleteLocal(objectKey: string): Promise<void> {
  await rm(localPathFor(objectKey), { force: true });
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function sha256Hex(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function amzDate(date: Date): { longDate: string; shortDate: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    longDate: iso,
    shortDate: iso.slice(0, 8),
  };
}

function signingKey(date: string): Buffer {
  const secret = env.R2_SECRET_ACCESS_KEY;

  if (!secret) {
    throw new ApplicationError({
      code: "CONFIGURATION_MISSING",
      message: "R2 secret is missing",
      safeMessage: "Konfigurasi storage belum lengkap.",
      statusCode: 500,
    });
  }

  const dateKey = hmac(`AWS4${secret}`, date);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
}

function signR2Request(input: {
  method: "DELETE" | "GET" | "PUT";
  objectKey: string;
  body?: Buffer;
  contentType?: string;
}): SignedRequest {
  assertSafeObjectKey(input.objectKey);

  if (!env.R2_ENDPOINT || !env.R2_BUCKET_NAME || !env.R2_ACCESS_KEY_ID) {
    throw new ApplicationError({
      code: "CONFIGURATION_MISSING",
      message: "R2 configuration is missing",
      safeMessage: "Konfigurasi storage belum lengkap.",
      statusCode: 500,
    });
  }

  const now = new Date();
  const { longDate, shortDate } = amzDate(now);
  const endpoint = new URL(env.R2_ENDPOINT);
  const encodedKey = input.objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const pathname = `/${env.R2_BUCKET_NAME}/${encodedKey}`;
  const url = new URL(pathname, endpoint);
  const payloadHash = sha256Hex(input.body ?? "");
  const headers = new Headers({
    host: endpoint.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": longDate,
  });

  if (input.contentType) {
    headers.set("content-type", input.contentType);
  }

  const signedHeaders = Array.from(headers.keys()).sort().join(";");
  const canonicalHeaders = Array.from(headers.keys())
    .sort()
    .map((key) => `${key}:${headers.get(key)}`)
    .join("\n");
  const canonicalRequest = [
    input.method,
    pathname,
    "",
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${shortDate}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    longDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = createHmac("sha256", signingKey(shortDate)).update(stringToSign).digest("hex");

  headers.set(
    "authorization",
    `AWS4-HMAC-SHA256 Credential=${env.R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  );

  return { url: url.toString(), headers };
}

async function putR2(input: StoragePutInput): Promise<void> {
  const signed = signR2Request({
    method: "PUT",
    objectKey: input.objectKey,
    body: input.body,
    contentType: input.contentType,
  });
  const response = await fetch(signed.url, {
    method: "PUT",
    headers: signed.headers,
    body: new Uint8Array(input.body),
  });

  if (!response.ok) {
    throw new ApplicationError({
      code: "INTERNAL_ERROR",
      message: `R2 put failed with ${response.status}`,
      safeMessage: "File belum dapat disimpan.",
      statusCode: 500,
    });
  }
}

async function getR2(objectKey: string): Promise<Buffer> {
  const signed = signR2Request({ method: "GET", objectKey });
  const response = await fetch(signed.url, {
    method: "GET",
    headers: signed.headers,
  });

  if (!response.ok) {
    throw new ApplicationError({
      code: "NOT_FOUND",
      message: `R2 get failed with ${response.status}`,
      safeMessage: "File belum tersedia.",
      statusCode: 404,
    });
  }

  return Buffer.from(await response.arrayBuffer());
}

async function deleteR2(objectKey: string): Promise<void> {
  const signed = signR2Request({ method: "DELETE", objectKey });
  const response = await fetch(signed.url, {
    method: "DELETE",
    headers: signed.headers,
  });

  if (!response.ok && response.status !== 404) {
    throw new ApplicationError({
      code: "INTERNAL_ERROR",
      message: `R2 delete failed with ${response.status}`,
      safeMessage: "File belum dapat dibersihkan.",
      statusCode: 500,
    });
  }
}

export async function putPrivateObject(input: StoragePutInput): Promise<void> {
  if (env.STORAGE_DRIVER === "r2") {
    await putR2(input);
    return;
  }

  await putLocal(input);
}

export async function getPrivateObject(objectKey: string): Promise<Buffer> {
  if (env.STORAGE_DRIVER === "r2") {
    return getR2(objectKey);
  }

  return getLocal(objectKey);
}

export async function deletePrivateObject(objectKey: string): Promise<void> {
  if (env.STORAGE_DRIVER === "r2") {
    await deleteR2(objectKey);
    return;
  }

  await deleteLocal(objectKey);
}
