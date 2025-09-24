import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const slateEnv = path.resolve(process.cwd(), '.env.for.slate');
if (fs.existsSync(slateEnv)) {
  dotenv.config({ path: slateEnv });
} else {
  dotenv.config();
}