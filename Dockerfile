# Base IMAGE para Node.js 22 (LTS atual)
FROM node:22-alpine AS base

# 1. Instalar dependências
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# 2. Builder do Next.js
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ignorar telemetria do Next.js
ENV NEXT_TELEMETRY_DISABLED 1

# Gerar Cliente Prisma e Build
RUN npx prisma generate
RUN npm run build

# 3. Imagem de Execução (Runner)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Criar usuário não-root por segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

# O standalone build gera um server.js
CMD ["node", "server.js"]
