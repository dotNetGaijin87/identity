# syntax=docker/dockerfile:1
# Zero-dependency Node BFF — no npm install needed.
FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs ./
USER node
EXPOSE 4001
CMD ["node", "server.mjs"]
