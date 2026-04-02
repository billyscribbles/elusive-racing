FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable && yarn install

# Copy source and build Vite (VITE_* env vars must be set in Railway before deploy)
COPY . .
RUN yarn build

ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
