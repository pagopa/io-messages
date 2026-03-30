# IO Functions Messages CQRS

Azure functions che raccolgono le funzionalità CQRS del dominio Messaggi.

## Sviluppo in locale con Docker

```shell
cp env.example .env
pnpm install
pnpm build
docker-compose up -d --build
docker-compose logs -f functions
open http://localhost/some/path/test
```
