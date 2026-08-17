FROM node:20-slim

WORKDIR /app

ENV HTTP_PROXY="http://host.docker.internal:6767"
ENV HTTPS_PROXY="http://host.docker.internal:6767"
ENV NO_PROXY="localhost,127.0.0.1,backend"

COPY package.json package-lock.json* ./

RUN npm install --legacy-peer-deps

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=http://localhost:8000/api

RUN ./node_modules/.bin/next build || npx next build

EXPOSE 3000

CMD ["npm", "start"]
