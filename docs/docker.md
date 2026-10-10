# Entorno Docker de LivingMemories

El entorno local reúne la app Next.js, Nginx, PostgreSQL 18.6 con pgvector 0.8.7, un worker Node.js con pg-boss, MinIO y Mailpit. Las conexiones internas se configuran en Compose; las claves de AI se cargan en ejecución y no se copian a las imágenes.

## Arranque completo

Requisitos: Docker con Compose 2.24.0 o posterior, Node.js 22.12+ y pnpm 12.9.1 para los comandos del proyecto. Compose necesita esa versión para cargar `.env.local` opcionalmente mediante [`env_file.required`](https://docs.docker.com/reference/compose-file/services/#required). Los contenedores de la app y el worker usan Node.js 24.18.0.

```bash
pnpm install
pnpm docker:up
```

`docker:up` realiza estos pasos:

1. Prepara `.env`, conserva sus valores existentes y genera los secretos locales que falten.
2. Si la base ya está funcionando, guarda un respaldo privado en `backups/` antes de sustituir contenedores.
3. Construye las imágenes desde el código del checkout actual.
4. Levanta PostgreSQL, MinIO y Mailpit; aplica las migraciones existentes y crea el bucket privado y el usuario S3 de la aplicación.
5. Inicia el worker, la app y Nginx después de sus dependencias.
6. Espera las comprobaciones de salud y ejecuta pruebas de conexiones, S3 privado, correo local, un trabajo real de cola y el acceso a Next.js/Better Auth mediante Nginx.
7. Muestra el estado de las API externas mediante consultas de lectura, cuando hay claves. Una clave ausente se indica como `not_configured` y no impide levantar los servicios locales.

## Servicios y conexiones

| Servicio | Acceso desde el equipo | Dirección interna de Docker |
| --- | --- | --- |
| App mediante Nginx | [http://localhost:8081](http://localhost:8081) | `http://app:3000` |
| Estado completo de la app | [http://localhost:8081/api/health/ready](http://localhost:8081/api/health/ready) | `http://app:3000/api/health/ready` |
| PostgreSQL | `localhost:5433` | `db:5432` |
| MinIO S3 | [http://localhost:9000](http://localhost:9000), con credenciales | `http://minio:9000` |
| Consola MinIO | [http://localhost:9001](http://localhost:9001) | `minio:9001` |
| Correo capturado en Mailpit | [http://localhost:8025](http://localhost:8025) | `http://mailpit:8025` |
| SMTP de prueba | `localhost:1025` | `mailpit:1025` |
| Estado del worker | [http://localhost:3010/health/ready](http://localhost:3010/health/ready) | `http://worker:3010/health/ready` |

Los puertos se publican únicamente en `127.0.0.1`. Nginx enruta hacia la app; no sirve los originales del bucket. MinIO usa un usuario administrativo para inicialización y un usuario distinto para la aplicación, limitado a su bucket privado. La consola usa `MINIO_ROOT_USER` y `MINIO_ROOT_PASSWORD` de `.env`; los clientes usan `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY`.

Dentro de Docker, la URL PostgreSQL se construye con los campos `POSTGRES_*` y el host `db`, codificando correctamente usuario y contraseña. Las direcciones de S3, SMTP y worker se sustituyen por sus nombres internos. Nginx consulta el DNS de Docker para reconocer cambios de dirección cuando se recrea la app. Better Auth utiliza `DOCKER_APP_URL`, que debe coincidir con el puerto público de Nginx.

## API externas

Añadir las claves reales a `.env.local`:

```dotenv
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
```

Después de editar claves o variables, volver a ejecutar `pnpm docker:up` para recrear los contenedores afectados. `.env.local` se carga después de `.env`, pero las conexiones locales internas se fijan mediante Compose. Los modelos y campos de voz previstos están enumerados en `.env.example`.

```bash
pnpm docker:check:apis
```

Esta comprobación consulta los catálogos de OpenAI y ElevenLabs y solo imprime estados, nunca las claves ni las respuestas completas. No genera audio, texto o imágenes. Verificar el catálogo no acredita la calidad ni el acceso a todos los modelos de generación: esas pruebas pertenecen a los módulos AI y al control de consumo del SDD. Las claves se dejaron pendientes de incorporación por decisión del usuario.

## Comandos y datos persistentes

| Comando | Resultado |
| --- | --- |
| `pnpm docker:env` | Preparar variables y secretos locales sin sobrescribir valores existentes |
| `pnpm docker:up` | Construir, levantar, migrar y comprobar el entorno completo |
| `pnpm docker:check` | Repetir pruebas de conexiones y procesamiento de cola |
| `pnpm docker:check:apis` | Comprobar autenticación de catálogos externos sin generación |
| `pnpm docker:logs` | Ver registros de servicios |
| `pnpm docker:down` | Detener el entorno conservando los volúmenes |

Los volúmenes de PostgreSQL, MinIO y Mailpit conservan sus datos. El volumen PostgreSQL mantiene el nombre anterior del proyecto y la misma base PostgreSQL/Alpine, para reutilizar los datos existentes. La nueva migración activa pgvector sin eliminar tablas ni reinicializar la base. Los respaldos y `.env*` privados están excluidos de Git y del contexto de construcción.

MinIO y su cliente se compilan desde etiquetas fijadas de los repositorios oficiales. Esto evita depender de imágenes comunitarias antiguas que ya no se pueden descargar. La primera construcción descarga herramientas y módulos y tarda más; las posteriores reutilizan la caché de Docker. El worker también incluye FFmpeg/ffprobe, utilidades PDF, OCR español/inglés y conversión HEIC para los futuros procesadores de fuentes.

## Trabajo en ramas

Cambiar de rama y ejecutar `pnpm docker:up` reconstruye la app y el worker con ese código. El entorno es una compilación local, no una sesión con recarga automática del código. Para mantener recarga rápida, se puede usar `pnpm dev` en el host con la infraestructura levantada, conservando `BETTER_AUTH_URL=http://localhost:3000` para ese proceso.

Para entornos simultáneos de distintos worktrees, usar otro `COMPOSE_PROJECT_NAME`, puertos distintos y un `DOCKER_APP_URL` coincidente. Compose separa redes, imágenes y volúmenes por proyecto. Por ejemplo:

```bash
COMPOSE_PROJECT_NAME=livingmemories-feature APP_PORT=8082 DOCKER_APP_URL=http://localhost:8082 POSTGRES_PORT=5434 S3_PORT=9100 MINIO_CONSOLE_PORT=9101 MAILPIT_PORT=8125 SMTP_PORT=1125 WORKER_HEALTH_PORT=3110 pnpm docker:up
```

Ese proyecto crea sus propios datos: no copia automáticamente la base de otro worktree. Si también se usa Next.js nativo, sus direcciones en `.env` deben coincidir con los puertos del proyecto elegido.

## Alcance del worker y del piloto

El worker ya conecta a PostgreSQL, registra su cola y procesa `infrastructure.check`. Los handlers de transcripción, extracción, cuentos e imágenes se implementarán después con permisos, revisiones y topes de consumo. La app mantiene la base existente de autenticación; el flujo por invitaciones y los módulos familiares siguen en el backlog. Infraestructura lista no significa que la experiencia completa del piloto ya esté implementada.

## Validación realizada

Se comprobó el arranque sobre el volumen existente y desde un proyecto Compose nuevo, con ambas migraciones aplicadas. Pasaron la escritura/lectura S3 con rechazo de acceso anónimo, el correo local, un trabajo real procesado por el worker y el registro, sesión y cierre de sesión de Better Auth mediante Nginx. Los datos sintéticos de autenticación y el proyecto aislado de prueba se eliminaron. También pasaron lint, comprobación de tipos y compilación de la app. Las API externas quedaron en `not_configured`, según la decisión de incorporar las claves después.

Referencias: [MinIO oficial y distribución desde fuente](https://github.com/minio/minio), [pgvector](https://github.com/pgvector/pgvector), [pg-boss](https://github.com/timgit/pg-boss), [Mailpit en Docker](https://mailpit.axllent.org/docs/install/docker/).
