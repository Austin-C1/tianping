import { PrismaClient } from "@prisma/client";
import { PasswordService } from "../src/auth/password.service";

const prisma = new PrismaClient();
const passwordService = new PasswordService();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@pmx.local").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "change-me-123";
  const passwordHash = await passwordService.hash(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "ADMIN"
    },
    create: {
      email,
      passwordHash,
      role: "ADMIN"
    },
    select: {
      id: true,
      email: true,
      role: true
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "admin.seed",
      metadata: {
        email: user.email,
        role: user.role
      }
    }
  });

  console.log(`Seeded admin user: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
