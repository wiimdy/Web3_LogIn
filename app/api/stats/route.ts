import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 통계 데이터 조회
export async function GET() {
  try {
    // 종료 시간이 지난 세션을 자동으로 비활성화 후 통계 집계
    await prisma.session.updateMany({
      where: {
        isActive: true,
        endTime: {
          lt: new Date(),
        },
      },
      data: { isActive: false },
    });

    const totalSessions = await prisma.session.count();
    const totalAttendances = await prisma.attendance.count();
    const uniqueStudents = await prisma.attendance.groupBy({
      by: ['walletAddress'],
    });

    const activeSessions = await prisma.session.count({
      where: { isActive: true },
    });

    return NextResponse.json({
      totalSessions,
      totalAttendances,
      totalStudents: uniqueStudents.length,
      activeSessions,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
