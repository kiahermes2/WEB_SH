FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy production files
COPY package.json ./
COPY server.js ./
COPY dist ./dist
COPY data ./data

# Expose port
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

# Volume for persistent database
VOLUME ["/app/data"]

# Start production server
CMD ["node", "server.js"]
