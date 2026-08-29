import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { SubscriptionStatus, PlanTier } from '@prisma/client';

type MonthlyCountRow = {
  month: number;
  count: number | bigint;
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private buildMonthlySeries(rows: MonthlyCountRow[]) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    return months.map((month, index) => {
      const row = rows.find((entry) => entry.month === index + 1);

      return {
        month,
        count: Number(row?.count ?? 0),
      };
    });
  }

  async overview() {
    const totalSubscribers = await this.prisma.userSubscription.count();
    
    const activePlans = await this.prisma.userSubscription.count({
      where: {
        status: SubscriptionStatus.ACTIVE,
      },
    });

    const cancelledPlans = await this.prisma.userSubscription.count({
      where: {
        status: SubscriptionStatus.CANCELLED,
      },
    });

    const paidSubscriptions = await this.prisma.userSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        planType: {
          not: PlanTier.FREE,
        },
      },
      include: {
        plan: true,
      },
    });

    const monthlyRevenue = paidSubscriptions.reduce((sum, subscription) => {
      return sum + (subscription.plan?.price || 0);
    }, 0);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get last month data for comparison
    const lastMonthDate = new Date(currentYear, currentDate.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.getMonth() + 1;
    const lastYear = lastMonthDate.getFullYear();

    // Previous month's subscribers
    const prevTotalSubscribers = await this.prisma.$queryRaw<
      { count: number }[]
    >`
      SELECT COUNT(*)::int AS count
      FROM "UserSubscription"
      WHERE EXTRACT(MONTH FROM "createdAt")::int = ${lastMonth}
        AND EXTRACT(YEAR FROM "createdAt")::int = ${lastYear}
    `;

    // Previous month's active plans
    const prevActivePlans = await this.prisma.$queryRaw<
      { count: number }[]
    >`
      SELECT COUNT(*)::int AS count
      FROM "UserSubscription"
      WHERE status = 'ACTIVE'
        AND EXTRACT(MONTH FROM "createdAt")::int = ${lastMonth}
        AND EXTRACT(YEAR FROM "createdAt")::int = ${lastYear}
    `;

    // Previous month's cancelled plans
    const prevCancelledPlans = await this.prisma.$queryRaw<
      { count: number }[]
    >`
      SELECT COUNT(*)::int AS count
      FROM "UserSubscription"
      WHERE status = 'CANCELLED'
        AND EXTRACT(MONTH FROM "createdAt")::int = ${lastMonth}
        AND EXTRACT(YEAR FROM "createdAt")::int = ${lastYear}
    `;

    // Previous month's revenue
    const prevRevenueData = await this.prisma.$queryRaw<
      { sum: number | null }[]
    >`
      SELECT SUM(p.price)::float AS sum
      FROM "UserSubscription" us
      JOIN "SubscriptionPlan" p ON us."planId" = p.id
      WHERE us.status = 'ACTIVE'
        AND us."planType" <> 'FREE'
        AND EXTRACT(MONTH FROM us."createdAt")::int = ${lastMonth}
        AND EXTRACT(YEAR FROM us."createdAt")::int = ${lastYear}
    `;

    const prevSubscribers = prevTotalSubscribers[0]?.count || 0;
    const prevActive = prevActivePlans[0]?.count || 0;
    const prevCancelled = prevCancelledPlans[0]?.count || 0;
    const prevRevenue = prevRevenueData[0]?.sum || 0;

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    const subscriberChange = calculateChange(totalSubscribers, prevSubscribers);
    const activePlansChange = calculateChange(activePlans, prevActive);
    const cancelledPlansChange = calculateChange(cancelledPlans, prevCancelled);
    const revenueChange = calculateChange(monthlyRevenue, prevRevenue);

    return {
      metrics: {
        totalSubscribers: {
          count: totalSubscribers,
          change: parseFloat(subscriberChange.toFixed(2)),
        },
        activePlans: {
          count: activePlans,
          change: parseFloat(activePlansChange.toFixed(2)),
        },
        monthlyRevenue: {
          count: parseFloat(monthlyRevenue.toFixed(2)),
          change: parseFloat(revenueChange.toFixed(2)),
        },
        cancelledPlans: {
          count: cancelledPlans,
          change: parseFloat(cancelledPlansChange.toFixed(2)),
        },
      },
    };
  }

  async userManagement(filters: {
    status?: SubscriptionStatus;
    tier?: PlanTier;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Build where conditions
    const whereCondition: any = {
      isDeleted: false,
    };

    if (filters.search) {
      whereCondition.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Get users with filtering
    let userList = await this.prisma.user.findMany({
      where: whereCondition,
      include: {
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Apply status and tier filters on fetched data
    if (filters.status || filters.tier) {
      userList = userList.filter((user) => {
        const latestSubscription = user.subscriptions?.[0];

        if (!latestSubscription) return false;

        if (filters.status && latestSubscription.status !== filters.status) {
          return false;
        }

        if (filters.tier && latestSubscription.planType !== filters.tier) {
          return false;
        }

        return true;
      });
    }

    // Get total count for pagination
    let totalCount = await this.prisma.user.count({ where: whereCondition });

    // Adjust total count if filters were applied (post-fetch filtering)
    if (filters.status || filters.tier) {
      totalCount = userList.length;
    }

    return {
      userList,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    };
  }

  async blockUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isBolocked) {
      throw new NotFoundException('User is already blocked');
    }

    return await this.prisma.user.update({
      where: { id: userId },
      data: { isBolocked: true },
    });
  }

  async unblockUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isBolocked) {
      throw new NotFoundException('User is already unblocked');
    }
    return await this.prisma.user.update({
      where: { id: userId },
      data: { isBolocked: false },
    });
  }

  async deleteUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isDeleted) {
      throw new NotFoundException('User is already deleted');
    }

    const data = await this.prisma.user.update({
      where: { id: userId },
      data: { isDeleted: true },
    });

    return {
      message: 'User deleted (soft) successfully',
      data,
    };
  }

  async getAllSubscriptions(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const subscriptions = await this.prisma.userSubscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        plan: true,
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await this.prisma.userSubscription.count();

    return {
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        user: sub.user,
        plan: sub.plan,
        status: sub.status, 
        amount: sub.plan?.price || 0,
        startDate: sub.createdAt, 
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
