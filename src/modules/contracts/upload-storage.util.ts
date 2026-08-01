import * as os from 'os';
import * as path from 'path';

/**
 * Directory used to persist uploaded contract files.
 *
 * Vercel serverless functions run on AWS Lambda, where the app code directory
 * is READ-ONLY except for /tmp. multer's diskStorage() calls mkdirSync at
 * module load time, so pointing it at './uploads' crashes the whole app on
 * Vercel. Uploads are therefore kept in memory and written to this writable
 * directory instead.
 */
export function getUploadDir(): string {
  return process.env.VERCEL
    ? path.join(os.tmpdir(), 'uploads', 'contracts')
    : path.join(process.cwd(), 'uploads', 'contracts');
}
