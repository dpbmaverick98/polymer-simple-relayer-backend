# Stage 1: Build the application
FROM oven/bun:1 as build

WORKDIR /usr/src/app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code and build
COPY . .
RUN bun run build


# Stage 2: Create the production image
FROM oven/bun:1

WORKDIR /usr/src/app

# Copy production dependencies
COPY package.json bun.lockb ./
RUN bun install --production --frozen-lockfile

# Copy built application from the build stage
COPY --from=build /usr/src/app/dist ./dist
# Copy configuration files
COPY src/config ./src/config

# Expose a port if the app were to serve http, not needed for this relayer
# EXPOSE 3000

# The command to run the application
CMD ["bun", "run", "start:prod"] 