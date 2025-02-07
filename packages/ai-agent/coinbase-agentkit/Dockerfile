# Use a Node.js base image
FROM node:18

# Set the working directory
WORKDIR /usr/src/app

# Copy the project files into the container
COPY . .

# Install dependencies
RUN yarn install --frozen-lockfile

# Expose any necessary ports
EXPOSE 3000

# Command to start the application
CMD ["yarn", "start"]
