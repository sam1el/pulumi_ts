FROM node:18

WORKDIR /user/src/app

COPY package.json ./

RUN npm install

COPY . .

EXPOSE 80
CMD ["node", "index.ts"]

# Build the app
# docker build -t myapp .
# Run the app
# docker run -p 80:80 myapp
# Access the app at http://localhost:80
# Build the image
# docker build -t myapp .
# Run the container
# docker run -p 80:80 myapp
# Access the app at http://localhost:80