import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.SEED_DEMO_DATA !== 'true') {
    console.log('SEED_DEMO_DATA is not "true"; skipping demo user seeding.');
    return;
  }

  const demoPassword = process.env.DEMO_USER_PASSWORD;
  if (!demoPassword) {
    throw new Error(
      'DEMO_USER_PASSWORD environment variable is required when SEED_DEMO_DATA=true.'
    );
  }

  console.log('Seeding baseline demo accounts for ExpenseFlow...');
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const seedUsers = [
    {
      email: 'alice.req@test.com',
      name: 'Alice Requester',
      role: Role.REQUESTER,
      department: 'Engineering',
      passwordHash,
    },
    {
      email: 'bob.req@test.com',
      name: 'Bob Requester',
      role: Role.REQUESTER,
      department: 'Marketing',
      passwordHash,
    },
    {
      email: 'carol.rev@test.com',
      name: 'Carol Manager',
      role: Role.REVIEWER,
      department: 'Engineering',
      passwordHash,
    },
    {
      email: 'david.both@test.com',
      name: 'David Dual Role',
      role: Role.REVIEWER,
      department: 'Marketing',
      passwordHash,
    },
  ];

  for (const user of seedUsers) {
    // Non-destructive upsert: preserve existing user password hashes across redeployments.
    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        department: user.department,
      },
      create: user,
    });
    console.log(`Seeded user: ${upserted.email} [${upserted.role}] (${upserted.department})`);
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
