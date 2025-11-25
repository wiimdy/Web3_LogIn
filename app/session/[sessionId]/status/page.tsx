'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/contexts/Web3Context';

interface SessionData {
  id: number;
  sessionNumber: number;
  date: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  attendeeCount: number;
  capacity?: number | null;
  accessCode?: string;
  attendances: {
    walletAddress: string;
    tokenId: string | null;
    timestamp: string;
  }[];
}

export default function SessionStatusPage() {
  const { sessionId } = useParams();
  const { account, isConnected, isConnecting, connectWallet } = useWeb3();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!account) {
        setIsAdmin(false);
        setIsCheckingAdmin(false);
        return;
      }

      try {
        const response = await fetch(`/api/admin?walletAddress=${account}`);
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    checkAdmin();
  }, [account]);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error('Session not found');
        }
        const data = await response.json();
        setSessionData(data);
      } catch (error) {
        console.error('Failed to fetch session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin) {
      fetchSessionData();
    }

    // 5초마다 출석 인원 업데이트
    const interval = isAdmin
      ? setInterval(() => {
          fetchSessionData();
        }, 5000)
      : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionId, isAdmin]);

  useEffect(() => {
    if (!sessionData) return;

    const endTime = new Date(sessionData.endTime).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [sessionData]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            관리자 인증 필요
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            세션 현황은 관리자만 볼 수 있습니다. 지갑을 연결해주세요.
          </p>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-70"
          >
            {isConnecting ? '연결 중...' : '지갑 연결하기'}
          </button>
        </div>
      </div>
    );
  }

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">관리자 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            접근 권한 없음
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            관리자만 세션 현황을 볼 수 있습니다.
            <br />
            현재 지갑: {account?.slice(0, 6)}...{account?.slice(-4)}
          </p>
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || !sessionData) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  const totalStudents = sessionData.capacity ?? 50;
  const attendanceRate = Math.round((sessionData.attendeeCount / totalStudents) * 100);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            세션 현황
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            제 {sessionData.sessionNumber}회차 - {sessionData.date}
          </p>
        </div>

        {/* 메인 상태 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
          {/* 남은 시간 */}
          <div className="text-center mb-8">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              세션 종료까지
            </div>
            <div className="text-6xl font-bold font-mono text-blue-600 dark:text-blue-400 mb-4">
              {formatTime(timeRemaining)}
            </div>
            <div className="flex items-center justify-center gap-2">
              {sessionData.isActive ? (
                <>
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    진행 중
                  </span>
                </>
              ) : (
                <>
                  <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                  <span className="text-gray-600 dark:text-gray-400 font-semibold">
                    종료됨
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 출석 현황 + 내보내기 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  실시간 출석 현황
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {sessionData.attendeeCount} / {totalStudents}명
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {attendanceRate}%
                </div>
                <a
                  href={`/api/sessions/${sessionData.id}/export?adminWallet=${account}`}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                >
                  결과 CSV 다운로드
                </a>
              </div>
            </div>

            {/* 진행 바 */}
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
              <div
                className="bg-gradient-to-r from-[#0d47a1] to-[#1976d2] h-4 rounded-full transition-all duration-500"
                style={{ width: `${attendanceRate}%` }}
              ></div>
            </div>

            <div className="text-right text-sm text-gray-600 dark:text-gray-400">
              출석률: {attendanceRate}%
            </div>
          </div>
        </div>

        {/* 세션 정보 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            세션 정보
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">회차</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                제 {sessionData.sessionNumber}회
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">날짜</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {sessionData.date}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">시작 시간</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {new Date(sessionData.startTime).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">종료 시간</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {new Date(sessionData.endTime).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* 출석자 리스트 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            출석자 리스트
          </h3>
          {sessionData.attendances.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">아직 출석한 사용자가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      지갑 주소
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      토큰 ID
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      출석 시간
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sessionData.attendances.map((att) => (
                    <tr key={`${att.walletAddress}-${att.tokenId ?? att.timestamp}`}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                        {att.walletAddress.slice(0, 6)}...{att.walletAddress.slice(-4)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">
                        {att.tokenId ? `#${att.tokenId}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {new Date(att.timestamp).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
          <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            ℹ️ 안내
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• 이미 출석 인증을 완료하신 경우 이 페이지를 닫으셔도 됩니다</li>
            <li>• 출석 NFT는 세션 종료 후에도 지갑에서 확인 가능합니다</li>
            <li>• 세션이 종료되면 자동으로 출석 인증이 마감됩니다</li>
          </ul>
        </div>

        {/* 액션 버튼 */}
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/"
            className="block text-center px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
