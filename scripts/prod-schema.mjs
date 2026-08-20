import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const src = 'prisma/schema.prisma';
const dest = 'prisma/schema.prod.prisma';

const content = readFileSync(src, 'utf8');
writeFileSync(dest, content.replace('provider = "sqlite"', 'provider = "postgresql"'));
console.log(`[prod-schema] wrote ${dest}`);

execSync('npx prisma generate --schema prisma/schema.prod.prisma', { stdio: 'inherit' });