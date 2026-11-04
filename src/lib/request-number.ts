import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

export async function generateNextRequestNumber(
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `EXP-${currentYear}-`;

  const latest = await tx.expenseRequest.findFirst({
    where: {
      requestNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      requestNumber: 'desc',
    },
    select: {
      requestNumber: true,
    },
  });

  let nextSequence = 1;
  if (latest?.requestNumber) {
    const parts = latest.requestNumber.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSequence = parsed + 1;
      }
    }
  }

  const paddedSequence = String(nextSequence).padStart(4, '0');
  return `${prefix}${paddedSequence}`;
}
