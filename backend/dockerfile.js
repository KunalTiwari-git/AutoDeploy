function generateDockerfile(lang) {
  if (lang === 'node') {
    return `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "node index.js 2>/dev/null || node server.js 2>/dev/null || node app.js 2>/dev/null || node main.js"]`
  }

  if (lang === 'python') {
    return `FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi
EXPOSE 5000
CMD ["sh", "-c", "python app.py 2>/dev/null || python main.py 2>/dev/null || python wsgi.py 2>/dev/null || python run.py"]`
  }

  if (lang === 'go') {
    return `FROM golang:1.21-alpine AS build
WORKDIR /app
COPY . .
RUN go build -o main .
FROM alpine:latest
WORKDIR /app
COPY --from=build /app/main .
EXPOSE 8080
CMD ["./main"]`
  }

  if (lang === 'ruby') {
    return `FROM ruby:3.2-slim
WORKDIR /app
COPY . .
RUN if [ -f Gemfile ]; then bundle install; fi
EXPOSE 4567
CMD ["sh", "-c", "ruby app.rb 2>/dev/null || ruby main.rb 2>/dev/null || ruby server.rb 2>/dev/null || bundle exec ruby app.rb"]`
  }

  return null
}

module.exports = { generateDockerfile }