# Payment Updater Service

This is a Spring Boot project that manages reminders. It uses Maven for dependency management and building.

## Prerequisites

All necessary dependencies and tools are pre-configured within the development container. Ensure you are working inside the dev container environment.

## Getting Started

### Code style

This project follows the [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html). The code is automatically formatted at build time using [fmt-maven-plugin](https://github.com/spotify/fmt-maven-plugin) You can also format the code manually by running:

```bash
mvn fmt:format
```

Or check the code style without formatting:

```bash
mvn fmt:check
```

### Build the project

To compile the project and package it into a JAR file:

```bash
mvn clean package
```

### Run the application locally

Start the Spring Boot application:

```bash
mvn spring-boot:run
```

The Development Container is configured to run the application with the `dev` profile by default. If you want to run it with a different profile, you can specify it like this:

```bash
mvn spring-boot:run -Dspring.profiles.active=your-profile
```

### Run locally in Docker

From the repository root:

```bash
docker compose up --build -d --wait payment-updater kafka-ui
curl --fail http://127.0.0.1:9091/api/v1/health/ready
curl --fail http://127.0.0.1:9091/api/v1/health/live
```

Both endpoints return HTTP 200 with an empty body. In Bruno, select the
`Development` environment and run `payment-updater / Health`.

The optional `payment-updater` Compose profile uses the shared MongoDB, with
database `payment-updater`, collections `payment` and `payment-retry`, and
authentication database `admin`. Both Kafka consumers are enabled. The retry
job checks `payment-retry` every minute.
Application Insights instrumentation is disabled, and the pagoPA endpoint is
overridden to the local mock instead of the development profile's remote URL.
The application depends on MongoDB, the Event Hubs emulator and the pagoPA mock.
The container healthcheck checks application readiness and emulator HTTP health;
the application health endpoints alone do not check dependencies or processing.

#### Local resources

| Resource                     | Address or topic                           | Format / purpose                               |
| ---------------------------- | ------------------------------------------ | ---------------------------------------------- |
| MongoDB                      | `mongo:27017`, database `payment-updater`  | Payment index and failed-publication retries   |
| Kafka broker                 | `eventhubs:9092`                           | SASL_PLAINTEXT with local emulator credentials |
| Incoming CQRS messages       | `messages-payments`                        | Raw Avro, consumer group `consumer-message`    |
| Incoming Nodo payment events | `nodo-dei-pagamenti-biz-evt`               | JSON, consumer group `consumer-Payment`        |
| Outgoing updates             | `payment-updates`                          | JSON, also consumed by reminder when running   |
| pagoPA payment information   | `http://mock-server-pagopa-ecommerce:3000` | `GET /payment-requests/{rptId}`                |

The existing emulator configuration provisions these topics; no broker restart
or offset reset is needed. CQRS and Nodo are not started by this command:
publish synthetic inputs manually to exercise payment processing.

In Kafka UI (`http://localhost:8002`), select cluster `local` and topic
`messages-payments`. Use **ReminderAvro** as the value serializer, an empty key
and headers `{}`. This reuses the same legacy schema as reminder, with no Schema
Registry or Confluent header. Include all schema fields; the schema is
`src/main/resources/avro/message.json`. Nodo events and outgoing updates use the
**String** serializer with JSON content, not Avro.

When reminder is running, outgoing updates can mark matching reminder records
as paid. Use isolated message IDs and RPT IDs for manual tests.

Inspect processing with:

```bash
docker compose logs -f payment-updater
```

The HTTP port is bound only to localhost. Set `PAYMENT_UPDATER_LOCAL_PORT` to
change the host port, and update Bruno's `payment_updater_base_url` accordingly.
The existing runtime image is unchanged and runs on `linux/amd64`; ARM hosts
require amd64 emulation.

To stop only this application without stopping shared resources:

```bash
docker compose stop payment-updater
```

### Run tests

Execute unit tests:

```bash
mvn test
```

Run tests with coverage report:

```bash
mvn test jacoco:report
```

### Other useful Maven commands

Clean the target directory:

```bash
mvn clean
```

Compile the source code only:

```bash
mvn compile
```
