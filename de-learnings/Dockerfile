# syntax=docker/dockerfile:1
# Production image for the DE Academy learning app: build the Vite/React app to
# static files, then serve them with nginx. No Node at runtime — the final image
# is just nginx + a few hundred KB of static assets.
#
# NOTE: day-to-day development still uses `npm run dev` (per CLAUDE.md). This
# image is an opt-in way to run a built copy of the app locally without a Node
# toolchain. Build/run:
#   docker build -t de-learnings .
#   docker run --rm -p 8080:80 de-learnings   # then open http://localhost:8080
# or with Compose:
#   docker compose up --build                 # then open http://localhost:8080

# ---- build stage: compile the app to /app/dist ----
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first — this layer stays cached until the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

# Then the source, which changes most often, so the install layer above is reused.
COPY . .
RUN npm run build

# ---- runtime stage: serve the static build with nginx ----
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# The nginx base image already runs the server in the foreground as PID 1.
