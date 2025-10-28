FROM node:20-alpine

# Set working directory for the project
WORKDIR /app

# Environment variables for runtime configuration
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm install -g bun@1.3.1

# Copy and set up simplified entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port for Next.js
EXPOSE 3000

# Use simplified entrypoint for dependency management and startup
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["bun", "run", "dev", "--", "-H", "0.0.0.0"]