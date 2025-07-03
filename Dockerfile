FROM node:22-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# Install dependencies and rebuild sqlite3 for Alpine
RUN npm install && npm rebuild sqlite3

COPY . .

EXPOSE 3001 5173

CMD ["npm", "run", "start:dev"]