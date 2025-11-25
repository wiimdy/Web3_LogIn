import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 특정 세션 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);

    // accessCode 또는 숫자(id/sessionNumber) 모두 허용
    let session = await prisma.session.findFirst({
      where: {
        OR: [
          ...(Number.isNaN(numericId) ? [] : [{ id: numericId }, { sessionNumber: numericId }]),
          { accessCode: id },
        ],
      },
      include: {
        attendances: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 종료 시간이 지난 세션은 즉시 비활성화
    if (session.isActive && new Date(session.endTime) < new Date()) {
      session = await prisma.session.update({
        where: { id: session.id },
        data: { isActive: false },
        include: { attendances: true },
      });
    }

    return NextResponse.json({
      ...session,
      attendeeCount: session.attendances.length,
    });
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

// PATCH: 세션 업데이트 (종료 등)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);

    // id, sessionNumber, accessCode 모두 허용
    const targetSession = await prisma.session.findFirst({
      where: {
        OR: [
          ...(Number.isNaN(numericId) ? [] : [{ id: numericId }, { sessionNumber: numericId }]),
          { accessCode: id },
        ],
      },
    });

    if (!targetSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const body = await request.json();

    const session = await prisma.session.update({
      where: { id: targetSession.id },
      data: body,
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Failed to update session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

// DELETE: 세션 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);

    // id, sessionNumber, accessCode 모두 허용
    const targetSession = await prisma.session.findFirst({
      where: {
        OR: [
          ...(Number.isNaN(numericId) ? [] : [{ id: numericId }, { sessionNumber: numericId }]),
          { accessCode: id },
        ],
      },
    });

    if (!targetSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await prisma.session.delete({
      where: { id: targetSession.id },
    });

    return NextResponse.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Failed to delete session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
