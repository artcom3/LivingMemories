import "server-only";
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { storage } from "./infrastructure/connections";
import { required } from "./infrastructure/config";

export async function uploadToStorage(key: string, body: Buffer | Uint8Array, contentType: string) {
  const bucket = required("S3_BUCKET");
  const client = storage();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `/api/media/${encodeURIComponent(key)}`;
}

export async function getFromStorage(key: string) {
  const bucket = required("S3_BUCKET");
  const client = storage();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  return response;
}

export async function deleteFromStorage(key: string) {
  const bucket = required("S3_BUCKET");
  const client = storage();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}
