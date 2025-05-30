FROM node:24.1.0

WORKDIR /user/src/app

COPY package.json ./

RUN npm install

COPY . .

EXPOSE 80
CMD ["node", "server.js"]
