import 'dotenv/config';
import { runSeed } from '../drizzle/seeds';

runSeed()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('[seed] FAILED', err);
    process.exit(1);
  });
