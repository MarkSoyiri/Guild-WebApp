import { execSync } from 'node:child_process';

execSync('node scripts/prod-schema.mjs', { stdio: 'inherit' });
if (process.env.DATABASE_URL) {
  execSync('npx prisma migrate deploy --schema prisma/schema.prod.prisma', { stdio: 'inherit' });
} else {
  console.log('[vercel-build] DATABASE_URL not set — skipping migrate deploy');
}
execSync('npm run build -w server', { stdio: 'inherit' });
execSync('npm run build -w client', { stdio: 'inherit' });
console.log('[vercel-build] done');