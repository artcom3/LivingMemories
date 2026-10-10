# Keep the same PostgreSQL/Alpine base as the existing development volume.
FROM postgres:18.6-alpine AS vector-build
ARG PGVECTOR_VERSION=0.8.7
RUN apk add --no-cache build-base \
    && wget -q "https://github.com/pgvector/pgvector/archive/refs/tags/v${PGVECTOR_VERSION}.tar.gz" -O /tmp/pgvector.tar.gz \
    && tar -xzf /tmp/pgvector.tar.gz -C /tmp \
    && make -C "/tmp/pgvector-${PGVECTOR_VERSION}" OPTFLAGS="" with_llvm=no \
    && make -C "/tmp/pgvector-${PGVECTOR_VERSION}" install with_llvm=no DESTDIR=/vector

FROM postgres:18.6-alpine
COPY --from=vector-build /vector/usr/local/ /usr/local/
