# =============================================================================
# BotCriptoFy2 Backend - Dockerfile
# Uses Bun runtime for 10x faster performance
# =============================================================================

FROM oven/bun:1 as base
WORKDIR /app

# =============================================================================
# Dependencies stage
# =============================================================================
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install production dependencies
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# =============================================================================
# Build stage
# =============================================================================
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Run database migrations and build (if needed)
# RUN bun run db:generate
# RUN bun run build

# =============================================================================
# Production stage
# =============================================================================
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=build /app/ .

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bun && \
    chown -R bun:nodejs /app

USER bun

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun run healthcheck || exit 1

# Start the application
ENTRYPOINT ["bun", "run", "src/index.ts"]
