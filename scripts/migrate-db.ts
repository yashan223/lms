import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgrespassword@localhost:5432/edu_lms?schema=public";

async function main() {
  const pool = new Pool({ connectionString });
  console.log("Connecting to PostgreSQL database...");

  try {
    // 1. Add TUTOR to enum Role if not exists
    await pool.query(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TUTOR';`);
    console.log("✅ Ensured 'TUTOR' value exists in Role enum");
  } catch (e: any) {
    console.log("Note on Role enum:", e.message);
  }

  try {
    // 2. Rename instructorId to tutorId in courses table if instructorId exists
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'courses' AND column_name = 'instructorId';
    `);

    if (res.rows.length > 0) {
      await pool.query(`ALTER TABLE "courses" RENAME COLUMN "instructorId" TO "tutorId";`);
      console.log("✅ Renamed courses.instructorId to courses.tutorId");
    } else {
      console.log("ℹ️ courses.instructorId already renamed or not found");
    }
  } catch (e: any) {
    console.log("Note on courses column rename:", e.message);
  }

  try {
    // 3. Update any users with role 'INSTRUCTOR' to 'TUTOR'
    await pool.query(`UPDATE "users" SET "role" = 'TUTOR' WHERE "role"::text = 'INSTRUCTOR';`);
    console.log("✅ Migrated existing INSTRUCTOR users to TUTOR");
  } catch (e: any) {
    console.log("Note on user role update:", e.message);
  }

  try {
    // 4. Create TransactionType enum
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'SPEND', 'REFUND', 'BONUS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("✅ Ensured TransactionType enum exists");
  } catch (e: any) {
    console.log("Note on TransactionType enum:", e.message);
  }

  try {
    // 5. Create token_wallets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "token_wallets" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "balance" DOUBLE PRECISION NOT NULL DEFAULT 40,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE "token_wallets" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log("✅ Ensured token_wallets table & createdAt exist");
  } catch (e: any) {
    console.log("Note on token_wallets table:", e.message);
  }

  try {
    // 6. Create token_transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "token_transactions" (
        "id" TEXT PRIMARY KEY,
        "walletId" TEXT NOT NULL REFERENCES "token_wallets"("id") ON DELETE CASCADE,
        "amount" DOUBLE PRECISION NOT NULL,
        "type" "TransactionType" NOT NULL,
        "description" TEXT NOT NULL,
        "referenceId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Ensured token_transactions table exists");
  } catch (e: any) {
    console.log("Note on token_transactions table:", e.message);
  }

  try {
    // 7. Update any events with type ASSIGNMENT to DEADLINE
    await pool.query(`UPDATE "events" SET "type" = 'DEADLINE' WHERE "type"::text = 'ASSIGNMENT';`);
    console.log("✅ Migrated ASSIGNMENT events to DEADLINE");
  } catch (e: any) {
    console.log("Note on events update:", e.message);
  }

  await pool.end();
  console.log("Migration script complete.");
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
