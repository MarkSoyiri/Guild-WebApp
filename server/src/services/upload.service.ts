import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';
import { put, del } from '@vercel/blob';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
const AVATAR_DIR = path.join(UPLOADS_DIR, 'avatars');
const MAX_AVATAR_SIZE = 4 * 1024 * 1024;

export function ensureUploadDirs(): void {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

export function staticUploadsDir(): string {
  return UPLOADS_DIR;
}

function hasBlobStorage(): boolean {
  return env.BLOB_READ_WRITE_TOKEN !== '';
}

export async function saveAvatar(userId: string, buffer: Buffer): Promise<string> {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);
  const filename = `${userId}-${hash}.webp`;
  const resized = await sharp(buffer)
    .resize(512, 512, { fit: 'cover' })
    .webp({ quality: 82 })
    .toBuffer();

  let avatarUrl: string;
  if (hasBlobStorage()) {
    const blob = await put(`avatars/${filename}`, resized, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'image/webp',
    });
    avatarUrl = blob.url;
  } else {
    ensureUploadDirs();
    await sharp(resized).toFile(path.join(AVATAR_DIR, filename));
    avatarUrl = `/uploads/avatars/${filename}`;
  }

  await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
  return avatarUrl;
}

export function deleteStaleAvatar(url: string | null): void {
  if (!url) return;
  if (url.startsWith('https://') && url.includes('.blob.vercel-storage.com/')) {
    void del(url).catch(() => undefined);
    return;
  }
  if (!url.startsWith('/uploads/avatars/')) return;
  const target = path.join(AVATAR_DIR, path.basename(url));
  if (fs.existsSync(target)) {
    try {
      fs.unlinkSync(target);
    } catch {
      // best effort cleanup
    }
  }
}

export function validateImageSize(buffer: Buffer): void {
  if (buffer.length > MAX_AVATAR_SIZE) {
    throw new AppError(400, 'FILE_TOO_LARGE', 'Image must be 4MB or smaller');
  }
}