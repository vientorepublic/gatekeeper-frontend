# 배포와 실행 환경

[README](../README.md)의 설치·환경 설정·검증을 먼저 완료합니다. 어댑터 선택은 [svelte-options.js](../svelte-options.js), 빌드 명령은 [package.json](../package.json)을 기준으로 합니다.

## Cloudflare Pages

- 빌드 환경: Node.js 24.22.1 이상인 24.x
- Build command: `npm run build`
- Build output directory: `.svelte-kit/cloudflare`
- Root directory: 프론트엔드 저장소에 직접 연결하면 저장소 루트. 메타 저장소에 연결하면 `gatekeeper-frontend`이며 빌드 환경이 실제 서브모듈 소스를 checkout하는지도 확인합니다.

[wrangler.jsonc](../wrangler.jsonc)의 `pages_build_output_dir`는 동일 경로를 사용합니다. 임의의 정적 빌드 폴더로 대체하지 않습니다.

Preview와 Production 각각에 `PUBLIC_GATEKEEPER_API_BASE_URL`을 설정합니다. 브라우저에서 접근 가능한 백엔드 주소여야 합니다. 클라이언트 시크릿 등 비밀값을 `PUBLIC_*`에 넣지 않습니다.

백엔드 `CORS_ORIGINS`와 `OAUTH2_REDIRECT_URI`, FlowAuth 등록 콜백 URI가 배포된 프론트엔드 주소와 일치해야 합니다. Preview와 Production 주소가 다르면 로그인 환경도 각각 맞춰야 합니다. 프론트엔드의 사용하지 않는 `PUBLIC_FLOWAUTH_*` 값을 바꾸는 것으로 해결되지 않습니다.

로컬 Pages 에뮬레이터가 필요하면 프로젝트에서 관리하는 도구 버전을 먼저 확인합니다. 미리보기만을 위해 `npm install -D wrangler`로 manifest/lockfile을 임의 변경하지 않습니다.

## Node와 Docker

```bash
npm run build:node
HOST=0.0.0.0 PORT=5173 node build/index.js
```

외부 환경에 `ADAPTER=cloudflare`가 남아 있으면 해제합니다. Node 출력은 `build/`이며 Pages 출력과 다릅니다.

Dockerfile은 Node.js 24.22.1과 Node 어댑터를 사용합니다. 런타임은 `HOST=0.0.0.0`, `PORT=5173`이며 비루트 사용자로 실행됩니다. 메타 저장소 Compose는 프론트엔드를 호스트 `127.0.0.1:10002`로 공개합니다. 이 경우 콜백은 실제 접속하는 프론트엔드 주소를 사용합니다.

`prepare`는 SvelteKit이 설치된 개발 환경에서 타입 동기화를 수행하고 실패를 전파합니다. Docker runner처럼 SvelteKit을 제외한 production 설치에서는 생략합니다. 오류를 숨기려고 lifecycle script를 비활성화하지 않습니다.

## Node2Shell 보안 기준

직접 실행하는 Node 어댑터와 Docker 런타임도 Node.js 24.22.1 이상인 24.x를 사용합니다. CVE-2026-111497은 Node 내장 Brotli 디코더의 취약점이므로 SvelteKit 패키지 갱신만으로 해결되지 않습니다. Dockerfile 수정 후에는 이미지를 다시 빌드하고 컨테이너를 교체해야 합니다. 메타 저장소 Compose에서는 `docker exec gatekeeper-frontend node --version`으로 실제 버전을 확인합니다.

현재 인증·API 요청은 브라우저에서 실행됩니다. Cloudflare Pages의 요청 처리는 workerd이며 빌드 시 사용하는 Node와 별개입니다. 이후 Node SSR에서 외부 `fetch()`를 추가하면 Brotli 응답의 압축 해제 경로도 점검합니다. Production과 Preview 빌드의 `NODE_VERSION`은 `.node-version`과 일치시키고 실제 빌드 로그로 확인합니다. Pages 설정을 변경할 때 마스킹된 기존 secret 값을 그대로 다시 저장하지 않습니다.

[Node.js 보안 공지](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)를 기준으로 런타임을 관리합니다.

## 배포 확인

1. 요청한 GitHub 릴리즈의 최종 main SHA와 실제 배포 커밋이 같은지 확인합니다. 메타 저장소에서는 상위 릴리즈 절차를 따르며 GitHub 작업은 gh CLI로 수행합니다.
2. 실제 페이지 접속과 API 주소·CORS를 확인합니다.
3. 같은 브라우저 탭에서 로그인·콜백·대시보드 진입을 확인합니다.
4. 검증 환경의 계정·키로 목록·발급·폐기·세션 갱신을 확인합니다. 운영 키를 임의 폐기하지 않습니다.
5. 배포 URL·커밋·검증 결과와 미검증 항목을 기록합니다. Release 게시만으로 서비스 검증을 통과했다고 표시하지 않습니다.

## 문제 확인

- API/CORS 오류: 공개 API 주소의 브라우저 접근 가능 여부와 백엔드 Origin 허용을 확인합니다.
- OAuth state 오류: 로그인 시작과 콜백이 같은 Origin·탭인지, sessionStorage를 사용할 수 있는지 확인하고 로그인을 다시 시작합니다.
- 콜백 오류: 백엔드와 FlowAuth 등록 URI를 확인합니다. 현재 앱은 `/`에서 콜백을 처리합니다.
- 잘못된 출력: 선택된 어댑터와 실행 명령, Pages 출력 경로를 확인합니다.
- 검사 도구 버전 충돌: 현재 TypeScript 6.x와 SvelteKit·ESLint·테스트 도구의 peer 범위를 확인합니다. 강제 설치 대신 호환 범위를 조정합니다.
