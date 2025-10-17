/**
 * S3 Upload/Download Module
 * Handles backup storage in AWS S3 or S3-compatible services
 */

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';

interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
}

/**
 * Create S3 client instance
 */
function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * Upload file to S3
 */
export async function uploadToS3(config: S3Config, filePath: string, key: string): Promise<void> {
  const client = createS3Client(config);
  const fileContent = await fs.readFile(filePath);

  const fullKey = path.join(config.prefix, key);

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: fullKey,
    Body: fileContent,
    ContentType: key.endsWith('.sql') ? 'application/sql' : 'application/octet-stream',
    ServerSideEncryption: 'AES256',
    Metadata: {
      'uploaded-at': new Date().toISOString(),
      'original-name': path.basename(filePath),
    },
  });

  try {
    await client.send(command);
    console.log(`✅ Uploaded to S3: s3://${config.bucket}/${fullKey}`);
  } catch (error: any) {
    throw new Error(`S3 upload failed: ${error.message}`);
  }
}

/**
 * Download file from S3
 */
export async function downloadFromS3(config: S3Config, key: string, destinationPath: string): Promise<void> {
  const client = createS3Client(config);
  const fullKey = path.join(config.prefix, key);

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: fullKey,
  });

  try {
    const response = await client.send(command);

    if (!response.Body) {
      throw new Error('Empty response from S3');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as any;

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // Ensure destination directory exists
    const dir = path.dirname(destinationPath);
    await fs.mkdir(dir, { recursive: true });

    // Write to file
    await fs.writeFile(destinationPath, buffer);

    console.log(`✅ Downloaded from S3: s3://${config.bucket}/${fullKey} -> ${destinationPath}`);
  } catch (error: any) {
    throw new Error(`S3 download failed: ${error.message}`);
  }
}

/**
 * List backups in S3
 */
export async function listS3Backups(config: S3Config): Promise<string[]> {
  const client = createS3Client(config);

  const command = new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: config.prefix,
  });

  try {
    const response = await client.send(command);

    if (!response.Contents) {
      return [];
    }

    return response.Contents
      .filter(obj => obj.Key && !obj.Key.endsWith('/'))
      .map(obj => obj.Key!.replace(config.prefix, ''))
      .filter(key => key.endsWith('.dump') || key.endsWith('.sql') || key.endsWith('.gz') || key.endsWith('.enc'))
      .sort()
      .reverse();
  } catch (error: any) {
    throw new Error(`Failed to list S3 backups: ${error.message}`);
  }
}

/**
 * Delete backup from S3
 */
export async function deleteFromS3(config: S3Config, key: string): Promise<void> {
  const client = createS3Client(config);
  const fullKey = path.join(config.prefix, key);

  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: fullKey,
  });

  try {
    await client.send(command);
    console.log(`✅ Deleted from S3: s3://${config.bucket}/${fullKey}`);
  } catch (error: any) {
    throw new Error(`S3 deletion failed: ${error.message}`);
  }
}

/**
 * Sync local backups to S3
 */
export async function syncToS3(config: S3Config, localPath: string): Promise<void> {
  console.log('🔄 Syncing backups to S3...');

  const files = await fs.readdir(localPath);
  const backupFiles = files.filter(
    f => f.endsWith('.dump') || f.endsWith('.sql') || f.endsWith('.gz') || f.endsWith('.enc') || f.endsWith('.checksums')
  );

  let uploaded = 0;
  let skipped = 0;

  for (const file of backupFiles) {
    try {
      const filePath = path.join(localPath, file);
      await uploadToS3(config, filePath, file);
      uploaded++;
    } catch (error: any) {
      console.error(`⚠️  Failed to upload ${file}: ${error.message}`);
      skipped++;
    }
  }

  console.log(`✅ S3 sync completed: ${uploaded} uploaded, ${skipped} skipped`);
}
