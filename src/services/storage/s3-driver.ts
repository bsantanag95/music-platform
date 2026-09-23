import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { StorageProvider } from "./types";

/**
 * Driver S3-compatible (Cloudflare R2 u otro). Configurado desde variables
 * de entorno (`STORAGE_S3_*`). La URL pública se construye con el dominio
 * público de lectura (`STORAGE_PUBLIC_DOMAIN`), no con el endpoint del bucket.
 */
export function createS3Driver(
  endpoint: string,
  bucket: string,
  accessKeyId: string,
  secretAccessKey: string,
  publicDomain: string,
): StorageProvider {
  const client = new S3Client({
    endpoint,
    region: "auto",
    credentials: { accessKeyId, secretAccessKey },
  });

  return {
    async put(key: string, body: Buffer, contentType: string): Promise<void> {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
      );
    },

    async delete(key: string): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    publicUrl(key: string): string {
      const base = publicDomain.replace(/\/+$/, "");
      return `${base}/${key}`;
    },
  };
}
