#!/bin/bash
set -e

# mongodb
docker run -d \
  -p 56098:27017 \
  mongo:2.6

# consul
docker run -d \
  -p 61312:8500 \
  runnable/consul:v0.6.4 \
  consul agent -server -bootstrap-expect 1 -data-dir /tmp/data -client 0.0.0.0

# rabbitmq
docker run -d \
  -p 53006:5672 \
  -p 53007:15672 \
  rabbitmq:3-management

# redis
docker run -d \
  -p 63934:6379 \
  redis:2.8
