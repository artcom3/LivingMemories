# MinIO Community is distributed as source; build pinned official releases.
FROM golang:1.25-alpine AS go-base
RUN apk add --no-cache ca-certificates git
ENV CGO_ENABLED=0 GOMAXPROCS=2

FROM go-base AS server-build
ARG MINIO_VERSION=RELEASE.2025-09-07T16-13-09Z
WORKDIR /src
RUN wget -q "https://github.com/minio/minio/archive/refs/tags/${MINIO_VERSION}.tar.gz" -O /tmp/source.tar.gz \
    && tar -xzf /tmp/source.tar.gz --strip-components=1 -C /src
RUN --mount=type=cache,id=livingmemories-go-mod,target=/go/pkg/mod \
    --mount=type=cache,id=livingmemories-go-build,target=/root/.cache/go-build \
    go build -trimpath -ldflags="-s -w" -o /out/minio .

FROM go-base AS client-build
ARG MC_VERSION=RELEASE.2025-08-13T08-35-41Z
WORKDIR /src
RUN wget -q "https://github.com/minio/mc/archive/refs/tags/${MC_VERSION}.tar.gz" -O /tmp/source.tar.gz \
    && tar -xzf /tmp/source.tar.gz --strip-components=1 -C /src
RUN --mount=type=cache,id=livingmemories-go-mod,target=/go/pkg/mod \
    --mount=type=cache,id=livingmemories-go-build,target=/root/.cache/go-build \
    go build -trimpath -ldflags="-s -w" -o /out/mc .

FROM alpine:3.23 AS server
RUN apk add --no-cache ca-certificates curl \
    && addgroup -g 1001 minio && adduser -D -u 1001 -G minio minio \
    && mkdir /data && chown minio:minio /data
COPY --from=server-build /out/minio /usr/local/bin/minio
USER minio
EXPOSE 9000 9001
ENTRYPOINT ["minio"]

FROM alpine:3.23 AS client
RUN apk add --no-cache ca-certificates
COPY --from=client-build /out/mc /usr/local/bin/mc
ENTRYPOINT ["mc"]
