FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/config/package*.json ./packages/config/
COPY packages/types/package*.json ./packages/types/
COPY packages/validation/package*.json ./packages/validation/
COPY apps/api/package*.json ./apps/api/

RUN npm install

COPY . .

RUN npm run build --workspace=@klyro/config
RUN npm run build --workspace=@klyro/types
RUN npm run build --workspace=@klyro/validation
RUN npm run build --workspace=api

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=4000

COPY package*.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000

CMD ["npm", "run", "start:prod", "--workspace=api"]
