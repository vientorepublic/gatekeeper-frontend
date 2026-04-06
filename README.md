# Gatekeeper Frontend

SvelteKit + Tailwind CSS 기반 Gatekeeper 인증/키 관리 콘솔입니다.

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
- `PUBLIC_FLOWAUTH_CLIENT_SECRET_MOCK`: 프론트 브라우저 플로우용 모킹 시크릿

주의: 프론트엔드에는 실제 OAuth2 client secret을 넣지 않습니다.

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
