# 두개의 방, 한개의 폭탄 (Two Rooms and a Boom)

웹 기반 보드게임 진행자 및 카드 분배 시스템

## 프로젝트 소개

이 프로젝트는 인기 파티 게임 "[Two Rooms and a Boom](https://www.tuesdayknightgames.com/products/two-rooms-and-a-boom?srsltid=AfmBOoofKVg6ZDYmP-qYRBkRBRJyEup0qdMX3PzrRQ1LJZ_gYw27MWYx)"을 온라인에서 진행할 수 있도록 지원하는 웹 애플리케이션입니다. 여러 브라우저에서 동시에 접속하여 게임을 진행할 수 있습니다.

### 게임 소개

"두개의 방, 한개의 폭탄"은 사회적 추론과 협상이 핵심인 파티 게임입니다. 플레이어들은 두 개의 방으로 나뉘어 자신의 역할을 숨기고, 제한된 시간 내에 특정 목표를 달성해야 합니다.

## 주요 기능

### 현재 구현 목표

- **방 생성 및 관리**
  - 방장이 새로운 게임 방을 생성
  - 고유 방 코드를 통한 접근
  - 게임 설정 조정 (플레이어 수, 라운드 시간 등)

- **멀티 브라우저 지원**
  - 서로 다른 브라우저/기기에서 동시 접속
  - 실시간 플레이어 목록 동기화
  - 플레이어 상태 추적

- **게임 진행**
  - 역할 카드 자동 분배
  - 라운드 타이머 관리
  - 인질 교환 시스템
  - 게임 결과 판정

## 기술 스택

- **Frontend**: React 18+ with TypeScript, Vite
- **Backend**: Go 1.21+ with Gin framework
- **실시간 통신**: WebSocket (Gorilla WebSocket)
- **상태 관리**: In-memory store
- **테스팅**: Go testing framework, Integration tests

## 빠른 시작 (Quick Start)

### 필수 요구사항

- Go 1.21 이상
- Node.js 18 이상
- npm 또는 yarn

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/[username]/two-rooms-and-a-boom.git
cd two-rooms-and-a-boom

# 2. 환경 변수 설정
# 백엔드 환경 변수
cp backend/.env.example backend/.env
# 프론트엔드 환경 변수
cp frontend/.env.example frontend/.env

# 3. 백엔드 서버 실행
cd backend
go build -o server ./cmd/server
./server
# 서버가 http://localhost:8080 에서 실행됩니다

# 4. 프론트엔드 개발 서버 실행 (새 터미널)
cd frontend
npm install
npm run dev
# 프론트엔드가 http://localhost:5173 에서 실행됩니다
```

### 게임 시작하기

1. 브라우저에서 `http://localhost:5173` 접속
2. **"방 만들기"** 버튼 클릭하여 새 게임 방 생성
3. 생성된 **방 코드**를 다른 플레이어들과 공유
4. 다른 플레이어들은 **"방 참가"**를 통해 코드 입력하여 참가
5. 최소 6명이 모이면 방장이 **"게임 시작"** 클릭
6. 각 플레이어는 자신의 역할(대통령, 폭파범, 스파이, 요원)을 확인
7. 게임 종료 후 방장이 **"대기실로 돌아가기"**를 통해 재시작

## 프로젝트 구조

```
two-rooms-and-a-boom/
├── README.md
├── backend/                    # Go 백엔드 서버
│   ├── cmd/server/            # 서버 메인 엔트리포인트
│   ├── internal/
│   │   ├── handlers/          # HTTP 및 WebSocket 핸들러
│   │   ├── services/          # 비즈니스 로직
│   │   ├── store/             # 데이터 저장소
│   │   ├── models/            # 데이터 모델
│   │   └── websocket/         # WebSocket Hub 및 클라이언트
│   └── tests/integration/     # 통합 테스트
├── frontend/                   # React 프론트엔드
│   ├── src/
│   │   ├── components/        # 재사용 가능한 컴포넌트
│   │   ├── pages/             # 페이지 컴포넌트
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API 서비스
│   │   └── types/             # TypeScript 타입 정의
│   └── package.json
├── specs/                      # 기능 명세서 및 작업 목록
└── .specify/                   # 프로젝트 사양 템플릿
```

## 게임 규칙 요약

1. **팀 구성**: 플레이어들은 레드 팀과 블루 팀으로 나뉩니다
2. **특수 역할**: 대통령(블루 팀)과 폭파범(레드 팀)이 중요 역할
3. **라운드 진행**: 각 라운드마다 인질을 교환하며 정보를 수집
4. **승리 조건**:
   - 레드 팀: 폭파범이 대통령과 같은 방에 있으면 승리
   - 블루 팀: 폭파범과 대통령이 다른 방에 있으면 승리

## 구현 상태

### ✅ 완료된 기능 (Phase 1-6)

- [X] **방 생성 및 관리**
  - 6자리 랜덤 방 코드 생성
  - 플레이어 수 제한 (6-30명)
  - 방 상태 관리 (대기, 진행 중)

- [X] **플레이어 관리**
  - 방 참가 및 퇴장
  - 익명 닉네임 자동 생성
  - 닉네임 변경 기능
  - 방장 권한 자동 이전

- [X] **실시간 통신 (WebSocket)**
  - 플레이어 입장/퇴장 알림
  - 닉네임 변경 동기화
  - 게임 상태 실시간 업데이트
  - 연결 끊김 재연결 (최대 5회, 3초 간격)

- [X] **역할 분배 시스템**
  - 대통령 (블루 팀) 1명
  - 폭파범 (레드 팀) 1명
  - 스파이 (각 팀별, 플레이어 수에 따라 조정)
  - 요원 (나머지 플레이어)

- [X] **게임 진행**
  - 팀 자동 배분 (레드/블루)
  - 방 자동 배분 (빨간 방/파란 방)
  - 게임 리셋 기능

- [X] **UX/UI 개선**
  - 로딩 스피너
  - 한국어 에러 메시지
  - 브라우저 호환성 체크

- [X] **테스팅**
  - 유닛 테스트 (서비스 레이어)
  - 통합 테스트 (HTTP API)
  - E2E 테스트 (전체 플로우)

### 🚧 향후 개발 계획

- [ ] 라운드 시스템 및 타이머
- [ ] 인질 교환 기능
- [ ] 게임 결과 판정
- [ ] 배포 환경 설정

## 환경 변수 설정

### 백엔드 (Backend)

환경 변수는 `backend/.env` 파일에서 설정합니다:

```bash
# 서버 포트
PORT=8080

# Gin 모드: debug, release, test
GIN_MODE=debug

# 프론트엔드 URL (CORS 설정용)
FRONTEND_URL=http://localhost:5173
```

**프로덕션 설정:**
- `GIN_MODE=release`로 설정
- `FRONTEND_URL`을 실제 프론트엔드 도메인으로 변경

### 프론트엔드 (Frontend)

환경 변수는 `frontend/.env` 파일에서 설정합니다:

```bash
# 백엔드 API URL (HTTP)
VITE_API_BASE_URL=http://localhost:8080

# 백엔드 WebSocket URL
VITE_WS_BASE_URL=ws://localhost:8080
```

**프로덕션 설정:**
- `VITE_API_BASE_URL=https://api.your-domain.com`
- `VITE_WS_BASE_URL=wss://api.your-domain.com` (보안 WebSocket)

**참고:**
- `.env.example` 파일을 복사하여 `.env` 파일 생성
- `.env` 파일은 Git에 커밋되지 않음 (보안)
- 프로덕션 배포 시 `.env.production.example` 참고

## Docker & Kubernetes 배포

### Docker로 로컬 실행

```bash
# Docker Compose 사용
docker-compose up

# 또는 Docker만 사용
docker build -t two-rooms-boom:latest .
docker run -p 8080:8080 two-rooms-boom:latest
```

브라우저에서 `http://localhost:8080` 접속

### Kubernetes 배포

**단일 컨테이너 배포**: 프론트엔드와 백엔드가 하나의 컨테이너에서 실행되며, 단일 포트(8080)만 사용합니다.

```bash
# 1. Docker 이미지 빌드
docker build -t two-rooms-boom:latest .

# 2. Kubernetes에 배포
kubectl apply -f k8s/

# 3. 배포 상태 확인
kubectl get pods
kubectl get svc

# 4. 애플리케이션 접속 (minikube)
minikube service two-rooms-boom
```

**자동 빌드 & 배포 스크립트:**

```bash
# 기본 배포
./build-and-deploy.sh

# 특정 태그로 배포
./build-and-deploy.sh v1.0.0

# 레지스트리에 푸시하며 배포
REGISTRY=myregistry.com ./build-and-deploy.sh
```

자세한 내용은 [`k8s/README.md`](k8s/README.md) 참조

## 기여하기

이 프로젝트는 현재 개발 초기 단계입니다. 기여를 원하시는 분은 이슈를 생성하거나 Pull Request를 제출해주세요.

## 라이선스

(라이선스 선정 예정)

## 참고 자료

- [공식 게임 페이지](https://www.tuesdayknightgames.com/products/two-rooms-and-a-boom)
- [게임 규칙 PDF](https://www.tuesdayknightgames.com/tworoomsandaboom) (공식 웹사이트에서 무료 다운로드 가능)

---

**개발 시작일**: 2025-10-22
