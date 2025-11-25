# 📚 출석 인증 NFT 시스템

블록체인 수업을 위한 QR 코드 기반 출석 인증 및 NFT 발급 시스템입니다.

## 🎯 주요 기능
contract addres :0xBc4491fe16c7864f433fAA08E1e421b0ca8a0Bea
base sepolia
- **QR 코드 출석 체크인**: 관리자가 생성한 QR 코드로 간편한 출석 인증
- **NFT 발급**: 출석 시마다 고유한 NFT 발급
- **실시간 세션 관리**: 관리자 대시보드에서 출석 세션 생성 및 관리
- **출석 기록 조회**: 개인별 출석 이력 및 NFT 컬렉션 확인
- **MetaMask 연동**: 지갑 연결을 통한 사용자 인증

## 🛠 기술 스택

- **Frontend**: Next.js 16.0.3 (App Router), React 19.2.0, TypeScript
- **Styling**: Tailwind CSS 4
- **Web3**: ethers.js
- **Database**: SQLite + Prisma ORM
- **QR Code**: qrcode library

## 📋 사전 요구사항

- Node.js 18.0 이상
- npm 또는 yarn
- MetaMask 브라우저 확장 프로그램

## 🚀 시작하기

### 1. 저장소 클론 및 의존성 설치

```bash
git clone <repository-url>
cd decipher-log-in
npm install --legacy-peer-deps
```

### 2. 환경 변수 설정

`.env` 파일이 이미 생성되어 있습니다:

```env
DATABASE_URL="file:./dev.db"
```

### 3. 데이터베이스 초기화

```bash
# Prisma 마이그레이션 실행
npx prisma migrate dev

# Prisma Client 생성
npx prisma generate
```

### 4. 관리자 계정 설정

관리자 지갑 주소가 이미 데이터베이스에 등록되어 있습니다:

- **관리자 주소**: `0xA2e4FB945b572bdF4F8Cb11B5Cb2D5D9765d91fB`

추가 관리자를 등록하려면:

```bash
npx prisma studio
```

Prisma Studio에서 `Admin` 테이블에 새 레코드를 추가하세요.

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

## 📱 페이지 구조

- **`/`** - 메인 랜딩 페이지
- **`/attendance/[sessionId]`** - 출석 체크인 페이지 (QR 코드 스캔 후 이동)
- **`/my-attendance`** - 개인 출석 기록 및 NFT 갤러리
- **`/admin`** - 관리자 대시보드 (세션 생성 및 관리)
- **`/session/[sessionId]/status`** - 실시간 세션 현황
- **`/help`** - MetaMask 설정 가이드
- **`/error/*`** - 각종 에러 페이지

## 🗄 데이터베이스 스키마

### Session (출석 세션)

- `id`: 고유 ID
- `sessionNumber`: 회차 번호
- `date`: 날짜
- `startTime`: 시작 시간
- `endTime`: 종료 시간
- `isActive`: 활성 상태
- `qrCode`: QR 코드 데이터

### Attendance (출석 기록)

- `id`: 고유 ID
- `walletAddress`: 지갑 주소
- `sessionId`: 세션 ID (외래 키)
- `tokenId`: NFT 토큰 ID
- `timestamp`: 출석 시간

### Admin (관리자)

- `id`: 고유 ID
- `walletAddress`: 관리자 지갑 주소 (unique)

## 🔧 API 엔드포인트

### Sessions

- `GET /api/sessions` - 모든 세션 조회
- `POST /api/sessions` - 새 세션 생성
- `GET /api/sessions/[id]` - 특정 세션 조회
- `PATCH /api/sessions/[id]` - 세션 수정 (종료 등)
- `DELETE /api/sessions/[id]` - 세션 삭제

### Attendances

- `GET /api/attendances?walletAddress=[address]` - 출석 기록 조회
- `POST /api/attendances` - 출석 체크인

### Admin

- `GET /api/admin?walletAddress=[address]` - 관리자 권한 확인
- `POST /api/admin` - 관리자 추가

### Stats

- `GET /api/stats` - 통계 데이터 조회

## 🎨 디자인 시스템

### 컬러 팔레트 (서울대학교 테마)

- Primary Blue: `#0d47a1`
- Light Blue: `#1976d2`
- Sky Blue: `#42a5f5`
- Dark Blue: `#002171`
- Background: 흰색 (`#ffffff`)

### 폰트

- Body Text: Inter
- Headings: Poppins
- Monospace: JetBrains Mono

## 🔐 관리자 기능

관리자 지갑 주소로 로그인하면 다음 기능을 사용할 수 있습니다:

1. **세션 생성**: 새로운 출석 세션 생성 및 QR 코드 다운로드
2. **세션 관리**: 진행 중인 세션 확인 및 종료
3. **통계 확인**: 전체 출석 통계 및 회차별 출석률 확인

## 📦 프로젝트 구조

```
decipher-log-in/
├── app/
│   ├── (main)/           # 메인 페이지
│   ├── admin/            # 관리자 페이지
│   ├── attendance/       # 출석 체크인
│   ├── my-attendance/    # 내 출석 기록
│   ├── session/          # 세션 상태
│   ├── help/             # 도움말
│   ├── error/            # 에러 페이지
│   └── api/              # API 라우트
├── components/           # 재사용 가능한 컴포넌트
├── contexts/             # React Context (Web3)
├── lib/                  # 유틸리티 (Prisma Client)
├── prisma/               # 데이터베이스 스키마 및 마이그레이션
└── public/               # 정적 파일

```

## 🚧 향후 개발 계획

- [ ] 스마트 컨트랙트 배포 및 연동
- [ ] 실제 NFT 민팅 기능 구현
- [ ] IPFS를 통한 NFT 메타데이터 저장
- [ ] 출석 인증서 다운로드 기능
- [ ] 이메일 알림 기능
- [ ] 다크 모드 완전 지원

## 📄 라이선스

MIT License

## 👥 기여

Pull Request는 언제나 환영합니다!

## 📞 문의

문제가 있거나 질문이 있으시면 Issue를 생성해주세요.
