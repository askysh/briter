FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
# The bun workspace (packages/*) must be present or the frozen lockfile
# check fails inside the build context.
COPY packages ./packages
RUN bun install --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY . .
RUN bun run build

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/content ./content
# storage/ is dockerignored and volume-mounted at runtime; just create it.
RUN mkdir -p ./storage
COPY --from=build /app/worker ./worker
COPY --from=build /app/lib ./lib
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/package.json ./package.json
EXPOSE 3075
ENV PORT=3075
# The standalone output bundles its own server; `bun run start` expects a
# full node_modules and does not exist in this image.
CMD ["bun", "server.js"]
