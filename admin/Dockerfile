FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server.mjs ./
COPY lib ./lib
COPY public ./public
ENV NODE_ENV=production
EXPOSE 8080
USER node
CMD ["node", "server.mjs"]
