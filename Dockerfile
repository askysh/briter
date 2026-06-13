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
# The git-sync worker shells out to `git` (and pushes over SSH), neither of
# which ships in the base bun image. A uid-1001 user with a real passwd entry
# and HOME is also required: the container runs as 1001 and SSH aborts with
# "No user exists for uid 1001" if getpwuid() can't resolve it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git openssh-client ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -g 1001 briter \
    && useradd -u 1001 -g 1001 -m -d /home/briter -s /usr/sbin/nologin briter
ENV HOME=/home/briter
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
