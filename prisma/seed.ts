import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding baseline accounts for ExpenseFlow...');

  // Standard password for all seed accounts
  const passwordHash = await bcrypt.hash('Password123!', 10);

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
    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        department: user.department,
        passwordHash: user.passwordHash,
      },
      create: user,
    });
    console.log(`✓ Seeded user: ${upserted.email} [${upserted.role}] (${upserted.department})`);
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

