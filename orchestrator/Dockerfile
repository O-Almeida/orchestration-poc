# orchestrator/Dockerfile
FROM node:14

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

CMD ["npm", "start"]
