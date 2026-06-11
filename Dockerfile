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
COPY --from=build /app/storage ./storage
COPY --from=build /app/worker ./worker
COPY --from=build /app/lib ./lib
COPY --from=build /app/package.json ./package.json
EXPOSE 3075
CMD ["bun", "run", "start"]
