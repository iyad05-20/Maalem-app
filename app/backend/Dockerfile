FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source
COPY src/ ./src/

EXPOSE 3001

CMD ["node", "src/server.js"]
