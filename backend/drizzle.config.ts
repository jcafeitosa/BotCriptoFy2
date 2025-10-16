import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

/**
 * Drizzle Kit Configuration
 * @see https://orm.drizzle.team/docs/kit-overview
 */
export default defineConfig({
  schema: './src/modules/*/schema/*.schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
  // TimescaleDB extensions
  // TimescaleDB é compatível com PostgreSQL, então usamos o dialect postgresql
  // As hypertables são criadas via SQL migrations
});
