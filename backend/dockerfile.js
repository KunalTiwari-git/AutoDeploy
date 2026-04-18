function generateDockerfile(lang) {
  if (lang === "node") {
    return `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]`;
  }

  if (lang === 'python') {
  return `FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi
EXPOSE 5000
CMD ["python", "main.py"]`
}

  if (lang === "go") {
    return `FROM golang:1.21-alpine AS build
WORKDIR /app
COPY . .
RUN go build -o main .
FROM alpine:latest
WORKDIR /app
COPY --from=build /app/main .
EXPOSE 8080
CMD ["./main"]`;
  }

  if (lang === "ruby") {
    return `FROM ruby:3.2-slim
WORKDIR /app
COPY Gemfile* ./
RUN bundle install
COPY . .
EXPOSE 4567
CMD ["ruby", "app.rb"]`;
  }

  return null;
}

module.exports = { generateDockerfile };
