Kong API Gateway (DB-less)

This folder contains a minimal Docker Compose setup to run Kong in DB-less (declarative) mode.

Usage:

1. Start Kong:

```bash
cd Docker/kong
docker compose up -d
```

2. Kong will listen on:

- Proxy: http://localhost:8000
- Admin: http://localhost:8001

The declarative configuration proxies `/api` to the backend at `http://host.docker.internal:5000`.
On Linux you may need to replace `host.docker.internal` with your host IP or run the API in Docker as well.
