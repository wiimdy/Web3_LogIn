'use client';

import { useWeb3 } from '@/contexts/Web3Context';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface AttendanceRecord {
  id: number;
  walletAddress: string;
  sessionId: number;
  tokenId: string | null;
  txHash?: string | null;
  chainId?: string | null;
  timestamp: Date;
  session: {
    sessionNumber: number;
    date: string;
  };
}

export default function MyAttendancePage() {
  const { account, isConnected, connectWallet } = useWeb3();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!account) return;

      try {
        // 사용자의 출석 기록 가져오기
        const attendanceResponse = await fetch(`/api/attendances?walletAddress=${account}`);
        const attendanceData = await attendanceResponse.json();
        setAttendanceRecords(attendanceData);

        // 전체 세션 수 가져오기
        const sessionsResponse = await fetch('/api/sessions');
        const sessionsData = await sessionsResponse.json();
        setTotalSessions(sessionsData.length);
      } catch (error) {
        console.error('Failed to fetch attendance data:', error);
      }
    };

    fetchAttendanceData();
  }, [account]);

  const attendedSessions = attendanceRecords.length;
  const attendanceRate = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            지갑 연결이 필요합니다
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            출석 기록을 확인하려면 먼저 지갑을 연결해주세요.
          </p>
          <button
            onClick={connectWallet}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            지갑 연결하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-12 fade-in-up">
          <h1 className="text-5xl font-bold mb-3 font-[family-name:var(--font-poppins)]">
            <span className="gradient-text">내 출석 기록</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            지갑 주소: {account}
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="card-shadow bg-white dark:bg-gray-800 rounded-3xl p-8">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-medium">
              총 출석 횟수
            </div>
            <div className="text-5xl font-bold gradient-text font-[family-name:var(--font-poppins)]">
              {attendedSessions}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              / {totalSessions}회
            </div>
          </div>

          <div className="card-shadow bg-white dark:bg-gray-800 rounded-3xl p-8">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-medium">
              출석률
            </div>
            <div className="text-5xl font-bold text-green-600 dark:text-green-400 font-[family-name:var(--font-poppins)]">
              {attendanceRate}%
            </div>
            <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${attendanceRate}%` }}
              ></div>
            </div>
          </div>

          <div className="card-shadow bg-white dark:bg-gray-800 rounded-3xl p-8">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-medium">
              보유 NFT
            </div>
            <div className="text-5xl font-bold text-purple-600 dark:text-purple-400 font-[family-name:var(--font-poppins)]">
              {attendedSessions}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              개
            </div>
          </div>
        </div>

        {/* NFT 갤러리 */}
        {attendanceRecords.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              아직 출석 기록이 없습니다
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              QR 코드를 스캔하여 첫 번째 출석 NFT를 받아보세요!
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              홈으로 가기
            </Link>
          </div>
        ) : (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 font-[family-name:var(--font-poppins)]">
              출석 NFT 컴렉션
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {attendanceRecords.map((record) => (
                <div
                  key={record.tokenId}
                  className="card-shadow bg-white dark:bg-gray-800 rounded-3xl overflow-hidden hover:scale-105 transition-transform"
                >
                  {/* NFT 이미지 */}
                  <div className="aspect-square bg-gradient-to-br from-[#0d47a1] to-[#1976d2] flex items-center justify-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                    <div className="text-center relative z-10">
                      <div className="text-7xl font-bold mb-3 font-[family-name:var(--font-poppins)]">
                        #{record.session.sessionNumber}
                      </div>
                      <div className="text-2xl font-semibold">출석 인증</div>
                    </div>
                  </div>

                  {/* NFT 정보 */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 font-[family-name:var(--font-poppins)]">
                      제 {record.session.sessionNumber}회차 출석
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          토큰 ID
                        </span>
                        <span className="font-mono text-gray-900 dark:text-white">
                          #{record.tokenId ?? '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          날짜
                        </span>
                        <span className="text-gray-900 dark:text-white">
                          {record.session.date}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          시간
                        </span>
                        <span className="text-gray-900 dark:text-white">
                          {new Date(record.timestamp).toLocaleTimeString('ko-KR')}
                        </span>
                      </div>
                    </div>

                    {record.txHash ? (
                      <a
                        href={`https://sepolia.basescan.org/tx/${record.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors text-sm"
                      >
                        BaseScan에서 보기
                      </a>
                    ) : (
                      <div className="w-full mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-lg text-sm text-center">
                        트랜잭션 정보 없음
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
