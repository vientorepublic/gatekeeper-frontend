# Gatekeeper Frontend

Gatekeeper 프론트엔드(SvelteKit) 저장소입니다.

프로젝트 전반 소개와 멀티 리포지토리 구조는 루트 README를 참고하세요.

## 구현 범위

- FlowAuth OAuth2 Client SDK 기반 브라우저 로그인
- OAuth2 Access Token을 백엔드 세션 엔드포인트로 교환해 게이트웨이 토큰 발급
- Namespace별 API 키 조회/발급/폐기 UI

## 환경 변수

`.env.example`를 `.env`로 복사해 사용하세요.

- `PUBLIC_GATEKEEPER_API_BASE_URL`: Gatekeeper API URL
- `PUBLIC_FLOWAUTH_SERVER`: FlowAuth 서버 URL
- `PUBLIC_FLOWAUTH_CLIENT_ID`: FlowAuth 클라이언트 ID
- `PUBLIC_FLOWAUTH_REDIRECT_URI`: FlowAuth 콜백 URI (프론트 URL)
- `PUBLIC_FLOWAUTH_SCOPES`: 콤마 구분 스코프

## 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm run lint
npm run check
npm run build
```

## Cloudflare Pages 배포

이 프로젝트는 `@sveltejs/adapter-cloudflare`를 사용해 Cloudflare Pages에 배포할 수
있습니다. `wrangler.toml`의 `pages_build_output_dir`가 SvelteKit의 Pages 출력
디렉터리인 `.svelte-kit/cloudflare`를 가리킵니다.

Cloudflare 대시보드에서 다음과 같이 설정하세요.

- **Framework preset**: `SvelteKit`
- **Root directory**: `gatekeeper-frontend` (모노레포 루트에서 연결하는 경우)
- **Build command**: `ADAPTER=cloudflare npm run build`
- **Build output directory**: `.svelte-kit/cloudflare`
- **Node.js version**: `24`

`PUBLIC_*` 환경 변수는 빌드 시 클라이언트 번들에 포함되므로 Pages 프로젝트의
Settings > Environment variables에서 Preview와 Production에 각각 등록해야 합니다.
`PUBLIC_FLOWAUTH_REDIRECT_URI`는 배포된 프론트엔드의 실제 URL로 설정하세요.

Dockerfile은 기본값인 Node 어댑터를 계속 사용합니다. Cloudflare Pages 배포 시에만
빌드 명령에 `ADAPTER=cloudflare`를 지정하세요. 로컬에서 Pages 출력을 확인하려면
Wrangler를 설치한 뒤 다음 명령을 실행합니다.

```bash
npm install -D wrangler
ADAPTER=cloudflare npm run build
npx wrangler pages dev .svelte-kit/cloudflare
```
