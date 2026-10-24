FROM node:24.22.1-alpine AS hardened-malloc
RUN apk add --no-cache git build-base linux-headers
RUN git clone --depth 1 https://github.com/GrapheneOS/hardened_malloc.git /hardened_malloc
WORKDIR /hardened_malloc
RUN make CONFIG_NATIVE=false CONFIG_CXX_ALLOCATOR=false

FROM node:24.22.1-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts/prepare.mjs ./scripts/prepare.mjs
COPY vite.config.ts svelte-options.js tsconfig.json ./
COPY src/app.html src/env.ts ./src/
RUN npm ci

FROM node:24.22.1-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build:node

FROM node:24.22.1-alpine AS runner
WORKDIR /app

COPY --from=hardened-malloc /hardened_malloc/out/libhardened_malloc.so /usr/local/lib/libhardened_malloc.so

ENV NODE_ENV=production
ENV LD_PRELOAD=/usr/local/lib/libhardened_malloc.so
ENV HOST=0.0.0.0
ENV PORT=5173

RUN addgroup -g 1001 -S nodejs && adduser -S svelte -u 1001 -G nodejs

COPY package.json package-lock.json ./
COPY scripts/prepare.mjs ./scripts/prepare.mjs
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/build ./build

RUN chown -R svelte:nodejs /app
RUN find /bin /usr/bin /usr/local/bin -xdev \( -perm /4000 -o -perm /2000 \) -exec chmod -s {} + 2>/dev/null || true

USER svelte

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD node -e "const req=require('http').get('http://localhost:5173',(res)=>process.exit(res.statusCode>=200&&res.statusCode<500?0:1));req.on('error',()=>process.exit(1));req.setTimeout(2000,()=>{req.destroy();process.exit(1);});" || exit 1

CMD ["node", "build/index.js"]
