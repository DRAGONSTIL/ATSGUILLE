FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Keep Next standalone output at its canonical path so external start commands
# like `node .next/standalone/server.js` continue to work.
COPY --from=builder /app/.next/standalone ./.next/standalone
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Keep Prisma schema and full node_modules from deps so runtime Prisma CLI has all transitive deps.
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules ./node_modules
RUN mkdir -p ./node_modules/.bin && ln -sf ../prisma/build/index.js ./node_modules/.bin/prisma
EXPOSE 3000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma && node .next/standalone/server.js"]
