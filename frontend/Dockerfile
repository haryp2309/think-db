# Stage 1: Build frontend application
FROM node:20-alpine AS build

WORKDIR /app

# Enable pnpm package manager
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./

# Install project dependencies
RUN pnpm install

# Copy frontend source code and build production assets
COPY . .
RUN pnpm run build

# Stage 2: Serve application with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static bundle from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
