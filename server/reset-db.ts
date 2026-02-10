import { Pool } from "pg";

async function resetDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("Dropping all existing tables...");

  await pool.query(`
    DROP TABLE IF EXISTS
      audit_log,
      disputes,
      credentials,
      status_lists,
      credential_types,
      issuers,
      users,
      holders,
      session
    CASCADE;
  `);

  console.log("All tables dropped successfully.");
  console.log("Run 'npm run db:push' to create the new schema, then restart the server to seed.");

  await pool.end();
}

resetDatabase().catch((err) => {
  console.error("Failed to reset database:", err);
  process.exit(1);
});
