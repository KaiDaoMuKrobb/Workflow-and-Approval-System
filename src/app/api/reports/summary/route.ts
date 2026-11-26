import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserFromRequest } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { RequestStatus } from '@prisma/client';

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
        updatedAt: 'desc',
      },
    });

    // 4. Compute High-Level Summary KPIs
    let totalApprovedAmount = 0;
    const departmentMap = new Map<string, { totalAmount: number; claimCount: number }>();
    const categoryMap = new Map<string, number>();
    const monthlyMap = new Map<string, { year: number; month: number; totalAmount: number; claimCount: number }>();

    for (const claim of approvedRequests) {
      const claimAmount = Number(claim.totalAmount);
      totalApprovedAmount += claimAmount;

      // Department aggregation (AC-84)
      const dept = claim.requester.department || 'Unassigned';
      const existingDept = departmentMap.get(dept) || { totalAmount: 0, claimCount: 0 };
      existingDept.totalAmount += claimAmount;
      existingDept.claimCount += 1;
      departmentMap.set(dept, existingDept);

      // Line items category aggregation (AC-85)
      for (const item of claim.items) {
        const itemAmount = Number(item.amount);
        const cat = item.category || 'OTHER';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + itemAmount);
      }

      // Monthly breakdown
      const date = new Date(claim.updatedAt || claim.createdAt);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const existingMonth = monthlyMap.get(monthKey) || { year, month, totalAmount: 0, claimCount: 0 };
      existingMonth.totalAmount += claimAmount;
      existingMonth.claimCount += 1;
      monthlyMap.set(monthKey, existingMonth);
    }

    totalApprovedAmount = Math.round(totalApprovedAmount * 100) / 100;

    // Format Department list
    const byDepartment = Array.from(departmentMap.entries())
      .map(([department, data]) => ({
        department,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
        claimCount: data.claimCount,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Format Category list with percentages
    const byCategory = Array.from(categoryMap.entries())
      .map(([category, amount]) => {
        const roundedAmount = Math.round(amount * 100) / 100;
        const percentage = totalApprovedAmount > 0
          ? Math.round((roundedAmount / totalApprovedAmount) * 10000) / 100
          : 0;
        return {
          category,
          totalAmount: roundedAmount,
          percentage,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Format Monthly Totals list
    const monthlyTotals = Array.from(monthlyMap.values())
      .map((data) => ({
        year: data.year,
        month: data.month,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
        claimCount: data.claimCount,
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

    return jsonSuccess({
      summary: {
        totalApprovedAmount,
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
