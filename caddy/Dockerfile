FROM caddy:builder-alpine@sha256:8e89605351333ad2cc2f3bcc95275a2ccc427f88914050e86a5fde0fd77a63c4 AS builder

# Rebuild the pinned Caddy release with the patched Go toolchain provided by
# the current official builder image.
ENV GOPROXY=https://goproxy.cn,direct
RUN xcaddy build v2.11.4 --output /usr/bin/caddy

FROM caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648

RUN apk upgrade --no-cache

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
