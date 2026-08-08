import { withTransaction } from "@/db/transaction";
import { updateAdminPasswordByEmail } from "@/modules/auth/auth.repository";
import { hashAdminPassword } from "@/modules/auth/password";
import { setAdminPasswordSchema } from "@/modules/auth/auth.schema";
import { logger } from "@/shared/logging/logger";

async function setPassword() {
  const [, , email, password] = process.argv;
  const parsed = setAdminPasswordSchema.parse({ email, password });
  const normalizedEmail = parsed.email.trim().toLowerCase();
  const passwordHash = await hashAdminPassword(parsed.password);

  const updated = await withTransaction((client) =>
    updateAdminPasswordByEmail(normalizedEmail, passwordHash, client),
  );

  if (!updated) {
    throw new Error("Admin email not found");
  }

  logger.info("Admin password updated", {
    normalizedEmail,
  });
}

setPassword().catch((error: unknown) => {
  logger.error("Failed to update admin password", {
    message: error instanceof Error ? error.message : "Unknown error",
  });
  process.exitCode = 1;
});
