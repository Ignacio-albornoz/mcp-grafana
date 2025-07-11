FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript config and source
COPY tsconfig.json ./
COPY src ./src

# Install dev dependencies for building
RUN npm install --save-dev typescript @types/node @types/express

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose HTTP port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]