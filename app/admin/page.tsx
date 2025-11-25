'use client';

import { useWeb3 } from '@/contexts/Web3Context';
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';

interface Session {
  id: number;
  sessionNumber: number;
  date: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  qrCode: string;
  accessCode?: string;
  attendeeCount?: number;
}

interface Stats {
  totalSessions: number;
  totalAttendances: number;
  totalStudents: number;
  activeSessions: number;
}

export default function AdminPage() {
  const { account, isConnected, connectWallet } = useWeb3();
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'stats'>('create');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrSessionNumber, setQrSessionNumber] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  // 세션 생성 폼 상태
  const [sessionForm, setSessionForm] = useState({
    sessionNumber: '',
    date: '',
    startTime: '',
    endTime: '',
    duration: 30,
    capacity: '',
    accessCode: '',
  });

  // 초기 날짜/시간을 현재 시각으로 세팅
  useEffect(() => {
    const now = new Date();
    // 로컬 기준 YYYY-MM-DD (UTC가 아니라 현재 시간대 사용)
    const date = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).format(now);
    const time = now.toTimeString().slice(0, 5);

    setSessionForm((prev) => ({
      ...prev,
      date: prev.date || date,
      startTime: prev.startTime || time,
    }));
  }, []);

  // 관리자 권한 확인
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

  // 세션 목록 가져오기
  useEffect(() => {
    if (isAdmin && activeTab === 'manage') {
      fetchSessions();
    }
  }, [isAdmin, activeTab]);

  // 통계 가져오기
  useEffect(() => {
    if (isAdmin && activeTab === 'stats') {
      fetchStats();
    }
  }, [isAdmin, activeTab]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const fetchNextSessionNumber = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data: Session[] = await response.json();
      const maxSessionNumber = data.reduce(
        (max, session) => Math.max(max, session.sessionNumber),
        0
      );
      const nextNumber = maxSessionNumber + 1;

      setSessionForm((prev) => ({
        ...prev,
        sessionNumber: prev.sessionNumber || nextNumber.toString(),
      }));
    } catch (error) {
      console.error('Failed to fetch next session number:', error);
    }
  };

  useEffect(() => {
    if (isAdmin && activeTab === 'create') {
      fetchNextSessionNumber();
    }
  }, [isAdmin, activeTab]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingSession(true);

    try {
      const sessionNumberInt = parseInt(sessionForm.sessionNumber, 10);
      if (Number.isNaN(sessionNumberInt)) {
        throw new Error('회차 번호를 확인해주세요.');
      }

      const generateAccessCode = () => {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
          const parts = Array.from(crypto.getRandomValues(new Uint32Array(2))).map((v) =>
            v.toString(36)
          );
          return `${Date.now().toString(36)}-${parts.join('')}`;
        }
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      };

      const accessCode = sessionForm.accessCode || generateAccessCode();

      // 종료 시간 계산
      const [hours, minutes] = sessionForm.startTime.split(':').map(Number);
      const startDate = new Date(`${sessionForm.date}T${sessionForm.startTime}:00`);
      const endDate = new Date(startDate.getTime() + sessionForm.duration * 60000);

      // QR 코드 생성
      const sessionUrl = `${window.location.origin}/attendance/${accessCode}`;
      const qrDataUrl = await QRCode.toDataURL(sessionUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // 세션 생성 API 호출
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionNumber: sessionNumberInt,
          date: sessionForm.date,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          qrCode: qrDataUrl,
          capacity: sessionForm.capacity ? parseInt(sessionForm.capacity, 10) : undefined,
          accessCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || '세션 생성에 실패했습니다.');
      }

      setQrCodeUrl(qrDataUrl);
      setQrSessionNumber(sessionForm.sessionNumber);
      alert('세션이 생성되었습니다! QR 코드를 다운로드하거나 공유하세요.');

      // 다음 회차 번호를 자동으로 제안
      setSessionForm((prev) => ({
        ...prev,
        sessionNumber: (sessionNumberInt + 1).toString(),
        accessCode: '',
      }));
      
      // 세션 목록 새로고침
      if (activeTab === 'manage') {
        fetchSessions();
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('세션 생성에 실패했습니다.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl || !qrSessionNumber) return;
    const link = document.createElement('a');
    link.download = `attendance-session-${qrSessionNumber}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const handleEndSession = async (sessionId: number) => {
    if (!confirm('세션을 종료하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to end session');
      }

      alert('세션이 종료되었습니다.');
      fetchSessions();
    } catch (error) {
      console.error('Failed to end session:', error);
      alert('세션 종료에 실패했습니다.');
    }
  };

  const handleManualAttendance = async (sessionId: number) => {
    if (!account) {
      alert('관리자 지갑이 연결되어야 합니다.');
      return;
    }

    const wallet = prompt('출석 처리할 지갑 주소를 입력하세요 (0x...)');
    if (!wallet) return;

    try {
      const response = await fetch('/api/attendances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: wallet,
          sessionId,
          adminWallet: account,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || '출석 처리에 실패했습니다.');
      }

      alert('출석을 등록했습니다.');
      fetchSessions();
    } catch (error) {
      console.error('Failed to add attendance:', error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('출석 처리에 실패했습니다.');
      }
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            관리자 인증 필요
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            관리자 페이지에 접근하려면 지갑을 연결해주세요.
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            접근 권한 없음
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            관리자만 접근할 수 있는 페이지입니다.
            <br />
            현재 지갑: {account?.slice(0, 6)}...{account?.slice(-4)}
          </p>
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
            <span className="gradient-text">관리자 대시보드</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            출석 세션을 생성하고 관리하세요
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="card-shadow bg-white dark:bg-gray-800 rounded-3xl mb-8">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 px-6 py-5 font-bold transition-all font-[family-name:var(--font-poppins)] ${
                activeTab === 'create'
                  ? 'text-[#0d47a1] dark:text-[#42a5f5] border-b-2 border-[#0d47a1] dark:border-[#42a5f5] bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              세션 생성
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'manage'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              세션 관리
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'stats'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              통계
            </button>
          </div>
        </div>

        {/* 세션 생성 탭 */}
        {activeTab === 'create' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                새 세션 생성
              </h2>
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    회차 번호
                  </label>
                  <input
                    type="number"
                    value={sessionForm.sessionNumber}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, sessionNumber: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    날짜
                  </label>
                  <input
                    type="date"
                    value={sessionForm.date}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, date: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    시작 시간
                  </label>
                  <input
                    type="time"
                    value={sessionForm.startTime}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, startTime: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    지속 시간 (분)
                  </label>
                  <input
                    type="number"
                    value={sessionForm.duration}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        duration: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    최대 인원 (선택)
                  </label>
                  <input
                    type="number"
                    value={sessionForm.capacity}
                    placeholder="기본 50명"
                    min={1}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        capacity: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingSession}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
                >
                  {isCreatingSession ? '생성 중...' : 'QR 코드 생성'}
                </button>
              </form>
            </div>

            {/* QR 코드 미리보기 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                QR 코드 미리보기
              </h2>
              {qrCodeUrl ? (
                <div className="text-center">
                  <Image
                    src={qrCodeUrl}
                    alt="Session QR Code"
                    width={400}
                    height={400}
                    className="w-full max-w-sm mx-auto mb-4 rounded-lg"
                  />
                  <button
                    onClick={downloadQRCode}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    QR 코드 다운로드
                  </button>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                    제 {qrSessionNumber ?? sessionForm.sessionNumber}회차 출석 QR 코드
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    링크: /attendance/**** (난수 코드 기반)
                  </p>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-600">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📱</div>
                    <p>QR 코드가 여기에 표시됩니다</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 세션 관리 탭 */}
        {activeTab === 'manage' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                세션 목록
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        회차
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        날짜
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        시간
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        출석 인원
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        정원
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sessions.map((session) => {
                      const startTime = new Date(session.startTime);
                      const endTime = new Date(session.endTime);
                      const formatTime = (date: Date) => {
                        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                      };

                      return (
                        <tr key={session.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            제 {session.sessionNumber}회
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {session.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {formatTime(startTime)} - {formatTime(endTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                session.isActive
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {session.isActive ? '진행 중' : '종료'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {session.attendeeCount || 0}명
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {session.capacity ?? 50}명
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button 
                              onClick={() => window.open(`/session/${session.sessionNumber}/status`, '_blank')}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                            >
                              상세
                            </button>
                            {session.isActive && (
                              <button 
                                onClick={() => handleEndSession(session.id)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                종료
                              </button>
                            )}
                            <button
                              onClick={() => handleManualAttendance(session.id)}
                              className="ml-3 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            >
                              출석 추가
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 통계 탭 */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  총 세션
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalSessions || 0}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  총 출석 수
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats?.totalAttendances || 0}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  총 참여 학생
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats?.totalStudents || 0}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  활성 세션
                </div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {stats?.activeSessions || 0}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                회차별 출석 현황
              </h3>
              <div className="space-y-4">
                {sessions.map((session) => {
                  const attendeeCount = session.attendeeCount || 0;
                  const maxAttendees = 50;
                  const percentage = Math.round((attendeeCount / maxAttendees) * 100);

                  return (
                    <div key={session.id}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">
                          제 {session.sessionNumber}회
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {attendeeCount}/{maxAttendees}명 ({percentage}%)
                        </span>
                      </div>
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
