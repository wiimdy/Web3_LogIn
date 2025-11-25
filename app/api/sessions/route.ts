import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

// GET: 모든 세션 조회
export async function GET() {
  try {
    // 종료 시간이 지난 세션을 자동으로 비활성화
    await prisma.session.updateMany({
      where: {
        isActive: true,
        endTime: {
          lt: new Date(),
        },
      },
      data: {
        isActive: false,
      },
    });

    const sessions = await prisma.session.findMany({
      include: {
        attendances: true,
      },
      orderBy: {
        sessionNumber: 'desc',
      },
    });

    const sessionsWithCount = sessions.map(session => ({
      ...session,
      attendeeCount: session.attendances.length,
    }));

    return NextResponse.json(sessionsWithCount);
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST: 새 세션 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionNumber, date, startTime, endTime, qrCode, capacity, accessCode } = body;

    // 입력 값 검증
    if (
      sessionNumber === undefined ||
      Number.isNaN(Number(sessionNumber)) ||
      !date ||
      !startTime ||
      !endTime
    ) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
    }

    // 중복 회차 방지
    const existingSession = await prisma.session.findUnique({
      where: { sessionNumber: Number(sessionNumber) },
    });

    if (existingSession) {
      return NextResponse.json(
        { error: '이미 존재하는 회차 번호입니다.' },
        { status: 409 }
      );
    }

    const session = await prisma.session.create({
      data: {
        sessionNumber: Number(sessionNumber),
        date,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        qrCode,
        isActive: true,
        capacity: capacity ? Number(capacity) : 50,
        accessCode: accessCode || randomBytes(6).toString('hex'),
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
