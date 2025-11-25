import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const adminWallet = searchParams.get('adminWallet');

    if (Number.isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid session identifier' }, { status: 400 });
    }

    if (!adminWallet) {
      return NextResponse.json({ error: 'adminWallet is required' }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({
      where: { walletAddress: adminWallet.toLowerCase() },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const session = await prisma.session.findFirst({
      where: {
        OR: [{ id: numericId }, { sessionNumber: numericId }],
      },
      include: {
        attendances: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const walletAddresses = session.attendances.map((att) => att.walletAddress.toLowerCase());
    const students = await prisma.student.findMany({
      where: { walletAddress: { in: walletAddresses } },
    });
    const studentMap = new Map(
      students.map((s) => [s.walletAddress.toLowerCase(), { name: s.name, studentId: s.studentId ?? '', email: s.email ?? '' }])
    );

    const header = [
      'sessionNumber',
      'sessionDate',
      'walletAddress',
      'studentName',
      'studentId',
      'email',
      'tokenId',
      'timestamp',
    ];
    const rows = session.attendances.map((att) => {
      const student = studentMap.get(att.walletAddress.toLowerCase());
      return [
        session.sessionNumber,
        session.date,
        att.walletAddress,
        student?.name ?? '',
        student?.studentId ?? '',
        student?.email ?? '',
        att.tokenId ?? '',
        att.timestamp.toISOString(),
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="session-${session.sessionNumber}-attendance.csv"`,
      },
    });
  } catch (error) {
    console.error('Failed to export attendance CSV:', error);
    return NextResponse.json({ error: 'Failed to export attendance CSV' }, { status: 500 });
  }
}
