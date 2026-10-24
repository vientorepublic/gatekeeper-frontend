# Gatekeeper Frontend

FlowAuth 로그인과 namespace별 API 키 조회·발급·폐기를 제공하는 웹 콘솔입니다. SvelteKit 3, Svelte 5, Vite 8, TypeScript, Tailwind CSS를 사용하며 Gatekeeper 백엔드 API와 통신합니다.

## 시작하기

Node.js 24.22.1 이상인 24.x와 npm, 설정된 Gatekeeper 백엔드가 필요합니다. 아래 명령은 이 저장소 디렉터리에서 실행합니다.

```bash
npm ci
cp .env.example .env
npm run dev
```

기존 `.env`가 있으면 복사 대신 필요한 항목만 갱신합니다. 기본 개발 주소는 `http://localhost:5173`입니다. 로그인하려면 아래 환경 설정과 백엔드 OAuth 설정을 먼저 맞추세요.

## 환경 설정

현재 앱이 읽는 공개 설정은 `PUBLIC_GATEKEEPER_API_BASE_URL`입니다. 기본값은 `http://localhost:3000`이며 브라우저에서 접근할 수 있는 백엔드 주소를 사용합니다. 메타 저장소 Compose의 백엔드에 연결한다면 `http://localhost:10001`처럼 호스트 공개 주소를 지정합니다.

백엔드와 FlowAuth에는 다음 설정이 필요합니다.

- 백엔드 `CORS_ORIGINS`: 실제 프론트엔드 Origin
- 백엔드 `OAUTH2_REDIRECT_URI`: 프론트엔드 로그인 콜백 주소(로컬 예: `http://localhost:5173/`)
- FlowAuth의 등록된 콜백 URI: 백엔드 설정과 동일한 주소
- FlowAuth 서버·클라이언트 ID·시크릿·scope: 백엔드 `OAUTH2_*`에서 설정

[.env.example](.env.example)에 남아 있는 `PUBLIC_FLOWAUTH_*` 값은 현재 앱 코드에서 읽지 않으며 로그인 설정을 바꾸지 않습니다. OAuth 토큰 교환은 백엔드가 수행합니다. `PUBLIC_*`는 브라우저에 노출되므로 클라이언트 시크릿을 넣지 않습니다. 공개 환경 변수 선언은 [src/env.ts](src/env.ts)를 기준으로 합니다.

## 주요 동작

- `/`: 백엔드 authorize API로 로그인 URL을 받아 이동하고 돌아온 code/state를 백엔드 callback API에 전달합니다.
- `/dashboard`: namespace 선택, 요청 예시, 키 목록·페이지 이동·발급·폐기를 제공합니다.
- 세션: 내부 JWT로 관리 API를 요청하고 OAuth refresh token으로 갱신합니다. 401 응답 후 갱신과 재시도는 한 번 수행합니다.
- 브라우저 저장소: 세션은 localStorage, 로그인 nonce는 sessionStorage를 사용합니다. 로그인을 시작한 같은 브라우저 탭에서 콜백을 완료해야 합니다.

키 원문은 발급 직후에만 표시됩니다. API 응답은 런타임 디코더로 검사하며 namespace 전환·로그아웃 이후 완료된 오래된 요청이 새 상태를 덮어쓰지 않도록 처리합니다.

## 코드 구조

```text
src/
  routes/+page.svelte         Login and OAuth callback
  routes/dashboard/          Namespace and API key dashboard
  routes/+layout.svelte      Shared layout and page head
  lib/auth/                  Session store, refresh, auth contracts
  lib/api/                   Requests, response decoders, API types
  lib/components/            Navigation, modals, dashboard panels
  lib/utils/                 Shared UI behavior
  env.ts                     Public environment schema
tests/mocks/                 Unit-test environment fixtures
```

SvelteKit 옵션은 [svelte-options.js](svelte-options.js)에서 정의해 [vite.config.ts](vite.config.ts)에 전달합니다. 내부 모듈은 `#lib` 별칭과 명시적인 `.js`/`.svelte` 확장자를 사용합니다.

## 검증

```bash
npm run lint
npm run check
npm test
npm run build
npm run build:node
```

`lint`는 Prettier·ESLint, `check`는 SvelteKit 타입 동기화와 Svelte 검사를 수행합니다. Vitest는 API 응답 검증과 인증 상태를 검사하며 실제 브라우저·FlowAuth 통합 테스트는 아닙니다. 관련 기능 변경 시 로그인·콜백·갱신·로그아웃, namespace 전환·키 발급/폐기·페이지 이동, 오류·로딩·빈 상태·키보드 포커스도 확인합니다.

## 빌드와 실행

- `npm run build`: Cloudflare 어댑터, 출력 `.svelte-kit/cloudflare`
- `npm run build:node`: 기본 Node 어댑터, 출력 `build/`
- `npm run preview`: 로컬 빌드 미리보기
- `HOST=0.0.0.0 PORT=5173 node build/index.js`: Node 출력 실행

`ADAPTER=cloudflare`가 외부 환경에 설정되어 있으면 먼저 해제한 뒤 Node 빌드를 실행합니다. Dockerfile은 Node.js 24에서 `build:node`를 수행하고 비루트 사용자로 5173 포트에서 실행합니다.

### Cloudflare Pages 배포

빌드 명령은 `npm run build`, 출력 디렉터리는 `.svelte-kit/cloudflare`입니다. 연결 저장소에 따른 Root directory와 공개 API 환경 변수, 콜백·CORS 확인 사항은 [배포 문서](docs/deployment.md)를 따르세요. GitHub Release와 실제 Pages 배포 성공은 별도로 확인합니다.

## 상세 문서

- [배포와 실행 환경](docs/deployment.md): Pages·Node/Docker 설정과 문제 확인
- [package.json](package.json): 스크립트, 모듈 별칭, 의존성
- [vitest.config.ts](vitest.config.ts): 단위 테스트 설정

메타 저장소 안에서는 상위 `AGENTS.md`, `docs/development-workflow.md`, `docs/github-release-workflow.md`, `agent_memories/README.md`를 먼저 읽습니다. 단독 clone에는 이 문서들이 포함되지 않습니다. 새 작업은 최신 dev에서 피처를 분기하며 GitHub 작업에는 gh CLI를 사용합니다. 버전·lockfile·병합·릴리즈 규칙은 상위 지침을 따릅니다.
