# Docker Practice

A containerized Express API using PostgreSQL, Redis, and Docker Compose.

## Stack
- Node.js
- Express
- PostgreSQL
- Redis
- Docker
- Docker Compose

## Run

cp .env.example .env

docker compose up --build

## Test

curl http://localhost:8080/health

## Stop

docker compose down

## Stop and delete data

docker compose down -v