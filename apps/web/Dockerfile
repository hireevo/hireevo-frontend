# syntax=docker/dockerfile:1

# Built from the repository root:
#   docker build -f apps/web/Dockerfile -t hireevo/web .
#
# The build arguments are baked into the client bundle by Next, so an image is
# tied to the origin it was built for. That is a property of NEXT_PUBLIC_*
# variables, not a choice — a "configure at runtime" image would need those
# values read on the server and passed down instead.

FROM node:26.8.1-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable pnpm
WORKDIR /app

# Dependencies are their own layer, keyed on the manifests alone, so editing a
# component does not reinstall the world.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/tokens/package.json packages/tokens/
COPY packages/ui-web/package.json packages/ui-web/
COPY e2e/package.json e2e/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
# `next start` cannot serve a standalone build, so the flag is set here and
# nowhere else — see the comment in next.config.ts.
ENV NEXT_OUTPUT_STANDALONE=true
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/tokens/node_modules ./packages/tokens/node_modules
COPY --from=deps /app/packages/ui-web/node_modules ./packages/ui-web/node_modules
COPY . .
RUN pnpm --filter @hireevo/tokens build && pnpm --filter @hireevo/web build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3100
ENV HOSTNAME=0.0.0.0

# The application never needs to write to its own image, and never runs as root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# `output: 'standalone'` traces exactly the files the server imports, so the
# runtime image carries no workspace, no pnpm store and no dev dependencies.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3100/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
