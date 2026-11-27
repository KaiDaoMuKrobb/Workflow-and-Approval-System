import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { RequestStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Authentication Guard (AC-80)
    const sessionUser = getSessionUserFromRequest(req);
    if (!sessionUser) {
      return jsonError('Authentication required', 'UNAUTHENTICATED', 401);
    }

    // 2. Role-Based Authorization Guard (AC-81) - Managerial / Reviewer access only
    if (sessionUser.role !== 'REVIEWER') {
      return jsonError('Forbidden: Insufficient privileges', 'FORBIDDEN', 403);
    }

    // 3. Query authoritative approved claims only (AC-83)
    const approvedRequests = await prisma.expenseRequest.findMany({
      where: {
        status: RequestStatus.APPROVED,
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            department: true,
          },
        },
        items: {
          select: {
            id: true,
            category: true,
            amount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 4. Compute High-Level Summary KPIs using Prisma.Decimal (SR-04 / DEC-04)
    let totalApprovedDecimal = new Prisma.Decimal(0);
    const departmentMap = new Map<string, { totalAmount: Prisma.Decimal; claimCount: number }>();
    const categoryMap = new Map<string, Prisma.Decimal>();
    const monthlyMap = new Map<string, { year: number; month: number; totalAmount: Prisma.Decimal; claimCount: number }>();

    for (const claim of approvedRequests) {
      const claimDecimal = new Prisma.Decimal(claim.totalAmount);
      totalApprovedDecimal = totalApprovedDecimal.plus(claimDecimal);

      // Department aggregation (AC-84)
      const dept = claim.requester.department || 'Unassigned';
      const existingDept = departmentMap.get(dept) || { totalAmount: new Prisma.Decimal(0), claimCount: 0 };
      existingDept.totalAmount = existingDept.totalAmount.plus(claimDecimal);
      existingDept.claimCount += 1;
      departmentMap.set(dept, existingDept);

      // Line items category aggregation (AC-85)
      for (const item of claim.items) {
        const itemDecimal = new Prisma.Decimal(item.amount);
        const cat = item.category || 'OTHER';
        const existingCat = categoryMap.get(cat) || new Prisma.Decimal(0);
        categoryMap.set(cat, existingCat.plus(itemDecimal));
      }

      // Monthly breakdown using stable createdAt timestamp
      const date = new Date(claim.createdAt);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const existingMonth = monthlyMap.get(monthKey) || { year, month, totalAmount: new Prisma.Decimal(0), claimCount: 0 };
      existingMonth.totalAmount = existingMonth.totalAmount.plus(claimDecimal);
      existingMonth.claimCount += 1;
      monthlyMap.set(monthKey, existingMonth);
    }

    // Format Department list (Strings end to end, DEC-04 / SR-04)
    const byDepartment = Array.from(departmentMap.entries())
      .map(([department, data]) => ({
        department,
        totalAmount: data.totalAmount.toFixed(2),
        claimCount: data.claimCount,
      }))
      .sort((a, b) => new Prisma.Decimal(b.totalAmount).minus(new Prisma.Decimal(a.totalAmount)).toNumber());

    // Format Category list with percentages
    const byCategory = Array.from(categoryMap.entries())
      .map(([category, amount]) => {
        const percentage = totalApprovedDecimal.greaterThan(0)
          ? Number(amount.dividedBy(totalApprovedDecimal).times(100).toFixed(2))
          : 0;
        return {
          category,
          totalAmount: amount.toFixed(2),
          percentage,
        };
      })
      .sort((a, b) => new Prisma.Decimal(b.totalAmount).minus(new Prisma.Decimal(a.totalAmount)).toNumber());

    // Format Monthly Totals list
    const monthlyTotals = Array.from(monthlyMap.values())
      .map((data) => ({
        year: data.year,
        month: data.month,
        totalAmount: data.totalAmount.toFixed(2),
        claimCount: data.claimCount,
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

    return jsonSuccess({
      summary: {
        totalApprovedAmount: totalApprovedDecimal.toFixed(2),
        totalApprovedClaims: approvedRequests.length,
        activeDepartmentCount: byDepartment.length,
      },
      byDepartment,
      byCategory,
      monthlyTotals,
    });
  } catch (error) {
    console.error('Error generating expense summary report:', error);
    return jsonError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
