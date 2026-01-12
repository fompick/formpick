# FormPick

운동을 기록하고 관리하는 웹앱입니다.

## 기술 스택

- **Next.js 15** - React 기반 프레임워크
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 스타일링
- **ESLint** - 코드 품질 관리

## 시작하기

### 1. 의존성 설치

터미널에서 다음 명령어를 실행하세요:

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 3. 프로덕션 빌드

```bash
npm run build
npm start
```

## 프로젝트 구조

```
formpick/
├── app/                 # Next.js App Router 디렉토리
│   ├── layout.tsx      # 루트 레이아웃
│   ├── page.tsx        # 홈 페이지
│   └── globals.css     # 전역 스타일
├── public/             # 정적 파일 (이미지, 아이콘 등)
├── package.json        # 프로젝트 의존성 및 스크립트
├── tsconfig.json       # TypeScript 설정
├── tailwind.config.ts  # Tailwind CSS 설정
└── next.config.ts      # Next.js 설정
```

## 개발 명령어

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm start` - 프로덕션 서버 실행
- `npm run lint` - 코드 린팅
