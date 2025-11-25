import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';

const attendanceNftAbi = [
  'function mintAttendance(address to, string memory tokenURI) public returns (uint256)',
  'function nextTokenId() public view returns (uint256)',
];

const rpcUrl = process.env.RPC_URL || process.env.BASE_RPC_URL || process.env.BASE || '';
const contractAddress = process.env.NFT_CONTRACT_ADDRESS || '';
const minterPrivateKey = process.env.NFT_MINTER_PRIVATE_KEY || process.env.PK || '';

// GET: 모든 출석 기록 조회 (또는 특정 지갑 주소의 출석 기록)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    const where = walletAddress ? { walletAddress } : {};

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        session: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return NextResponse.json(attendances);
  } catch (error) {
    console.error('Failed to fetch attendances:', error);
    return NextResponse.json({ error: 'Failed to fetch attendances' }, { status: 500 });
  }
}

// POST: 출석 체크인
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, sessionId, adminWallet } = body;

    // 중복 출석 체크
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        walletAddress_sessionId: {
          walletAddress,
          sessionId,
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: 'Already checked in for this session' },
        { status: 400 }
      );
    }

    // 세션이 활성화되어 있는지 확인
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 관리자 여부 확인 (임의 출석 허용)
    let isAdminOverride = false;
    if (adminWallet) {
      const admin = await prisma.admin.findUnique({
        where: { walletAddress: adminWallet.toLowerCase() },
      });
      isAdminOverride = !!admin;
      if (!isAdminOverride) {
        return NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 });
      }
    }

    if (!session.isActive && !isAdminOverride) {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 400 }
      );
    }

    // 세션 시간 확인 (관리자 오버라이드 시 생략)
    const now = new Date();
    if (!isAdminOverride && (now < session.startTime || now > session.endTime)) {
      return NextResponse.json(
        { error: 'Session is not available at this time' },
        { status: 400 }
      );
    }

    if (!rpcUrl || !contractAddress || !minterPrivateKey) {
      return NextResponse.json(
        { error: 'NFT mint configuration is missing (RPC_URL / NFT_CONTRACT_ADDRESS / NFT_MINTER_PRIVATE_KEY).' },
        { status: 500 }
      );
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    const signer = new Wallet(minterPrivateKey, provider);
    const contract = new Contract(contractAddress, attendanceNftAbi, signer);

    // 다음 토큰 ID 조회 (민팅 전)
    const nextTokenId = await contract.nextTokenId();

    const metadata = {
      name: `Attendance #${session.sessionNumber}`,
      description: `Attendance NFT for session ${session.sessionNumber} on ${session.date}`,
      attributes: [
        { trait_type: 'Session', value: session.sessionNumber },
        { trait_type: 'Date', value: session.date },
        { trait_type: 'Wallet', value: walletAddress },
      ],
    };

    const metadataUri = `data:application/json;base64,${Buffer.from(
      JSON.stringify(metadata)
    ).toString('base64')}`;

    // 온체인 민팅
    const tx = await contract.mintAttendance(walletAddress, metadataUri);
    const receipt = await tx.wait();

    // 출석 기록 생성
    const attendance = await prisma.attendance.create({
      data: {
        walletAddress,
        sessionId,
        tokenId: nextTokenId.toString(),
        tokenUri: metadataUri,
        txHash: receipt?.hash,
        contractAddress,
        chainId: network.chainId.toString(),
      },
      include: {
        session: true,
      },
    });

    return NextResponse.json(attendance, { status: 201 });
  } catch (error) {
    console.error('Failed to create attendance:', error);

    if (error instanceof Error && error.message.includes('Unknown argument')) {
      return NextResponse.json(
        {
          error:
            'Database schema is missing NFT fields. Please run Prisma migrate/generate to add tokenUri/txHash/contractAddress/chainId.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Failed to create attendance' }, { status: 500 });
  }
}
