FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose the port (Cloud Run sets the PORT env variable)
EXPOSE 8080

# Start the application
CMD [ "npm", "start" ]
