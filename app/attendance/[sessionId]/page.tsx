'use client';

import { useWeb3 } from '@/contexts/Web3Context';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SessionData {
  id: number;
  sessionNumber: number;
  date: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
}

export default function AttendancePage() {
  const { sessionId } = useParams();
  const router = useRouter();
  const { account, isConnected, connectWallet } = useWeb3();
  const [isMinting, setIsMinting] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkIfAlreadyAttended = async (sessionDbId: number) => {
      if (!account) return;

      try {
        const response = await fetch(`/api/attendances?walletAddress=${account}`);
        const attendances = await response.json();
        const alreadyAttended = attendances.some(
          (att: { sessionId: number }) => att.sessionId === sessionDbId
        );
        setIsCheckedIn(alreadyAttended);
      } catch (error) {
        console.error('Failed to check attendance:', error);
      }
    };

    const fetchSessionData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error('Session not found');
        }
        const data = await response.json();
        setSessionData(data);

        // 이미 출석했는지 확인
        if (account) {
          await checkIfAlreadyAttended(data.id);
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
        alert('세션을 찾을 수 없습니다.');
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId, account, router]);

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

  const handleMint = async () => {
    if (!isConnected || !account) {
      alert('먼저 지갑을 연결해주세요.');
      return;
    }

    if (!sessionData) return;

    setIsMinting(true);
    try {
      // 출석 기록 생성
      const response = await fetch('/api/attendances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: account,
          sessionId: sessionData.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check in');
      }

      setIsCheckedIn(true);
      alert('출석 인증 NFT가 성공적으로 발급되었습니다!');
    } catch (error: unknown) {
      console.error('Minting failed:', error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('NFT 발급에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsMinting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return null;
  }

  if (timeRemaining === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            세션이 종료되었습니다
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            출석 인증 시간이 만료되었습니다. 다음 수업 시간에 다시 시도해주세요.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (isCheckedIn) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            출석 완료!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            출석 인증 NFT가 성공적으로 발급되었습니다.
            <br />내 지갑에서 확인할 수 있습니다.
          </p>
          <div className="space-y-3">
            <Link
              href="/my-attendance"
              className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              내 출석 기록 보기
            </Link>
            <Link
              href="/"
              className="block w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="card-shadow bg-white dark:bg-gray-800 rounded-3xl p-10 border border-gray-100">
          {/* 세션 정보 */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 font-[family-name:var(--font-poppins)]">
              <span className="gradient-text">출석 체크인</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              제 {sessionData.sessionNumber}회차 - {sessionData.date}
            </p>
          </div>

          {/* 남은 시간 */}
          <div className="bg-gradient-to-br from-[#0d47a1] to-[#1976d2] rounded-2xl p-8 mb-10 text-center text-white shadow-xl">
            <div className="text-sm mb-3 opacity-90 font-medium">남은 시간</div>
            <div className="text-6xl font-bold font-[family-name:var(--font-jetbrains-mono)]">{formatTime(timeRemaining)}</div>
          </div>

          {/* 세션 상세 정보 */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">세션 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">회차</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  제 {sessionData.sessionNumber}회
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">날짜</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {sessionData.date}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">시간</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(sessionData.startTime).toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  })} - {new Date(sessionData.endTime).toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">상태</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    진행 중
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* 지갑 연결 및 민팅 */}
          {!isConnected ? (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                출석을 인증하려면 먼저 지갑을 연결해주세요
              </p>
              <button
                onClick={connectWallet}
                className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition-colors"
              >
                지갑 연결하기
              </button>
            </div>
          ) : (
            <div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✓ 지갑이 연결되었습니다: {account?.slice(0, 6)}...{account?.slice(-4)}
                </p>
              </div>
              <button
                onClick={handleMint}
                disabled={isMinting}
                className="btn-hover w-full px-6 py-5 bg-gradient-to-r from-[#0d47a1] to-[#1976d2] hover:from-[#002171] hover:to-[#0d47a1] disabled:from-gray-400 disabled:to-gray-500 text-white text-lg font-bold rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:scale-105 font-[family-name:var(--font-poppins)]"
              >
                {isMinting ? '발급 중...' : '출석 인증 NFT 발급받기 🎉'}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                * 버튼을 클릭하면 출석 인증 NFT가 발급됩니다
              </p>
            </div>
          )}
        </div>

        {/* 안내 사항 */}
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
            ⚠️ 유의사항
          </h4>
          <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
            <li>• 출석 인증은 세션당 1회만 가능합니다</li>
            <li>• 제한 시간 내에만 출석 인증이 가능합니다</li>
            <li>• NFT 발급 시 소량의 가스비가 발생할 수 있습니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
