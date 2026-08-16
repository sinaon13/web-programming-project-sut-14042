FROM node:20-slim

WORKDIR /app

ENV HTTP_PROXY="http://host.docker.internal:6767"
ENV HTTPS_PROXY="http://host.docker.internal:6767"
ENV NO_PROXY="localhost,127.0.0.1,backend"

COPY package.json ./
RUN npm install

COPY . .

RUN npx next build

EXPOSE 3000

CMD ["npm", "start"]
