# Reminder Service

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

### Run payment reminders in Docker

From the repository root:

```bash
docker compose up --build -d --wait reminder
curl --fail http://127.0.0.1:9090/health
```

The expected response is `Reminder Dev`. Set `REMINDER_LOCAL_PORT` to use another
host port.

The monorepo Compose starts reminder with the shared MongoDB, MySQL, Event Hubs
emulator and API mocks. It waits for the databases and mocks to be healthy;
the reminder container healthcheck also checks the emulator's health endpoint.
Reminder belongs to the optional `reminder` profile, so it is not started by an
untargeted `docker compose up`. The command above explicitly selects the service
and activates its profile.

The reminder HTTP port is exposed only on localhost. The application uses the
existing runtime image on `linux/amd64`; ARM hosts require amd64 emulation.
Agent instrumentation remains disabled. Read reminders, the message-status
consumer and the deletion job remain disabled; only payment processing is enabled.
The HTTP `/health` endpoint itself still checks application startup, not the
complete notification flow.

#### Local resources

| Resource                             | Address from reminder                                               | Address from the host                                    |
| ------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------- |
| Kafka-compatible Event Hubs emulator | `eventhubs:9092`                                                    | `localhost:9092`                                         |
| MongoDB                              | `mongo:27017`, database `reminder`, authentication database `admin` | `localhost:27017`                                        |
| MySQL / Quartz                       | `mysql:3306`, database `reminder`                                   | `localhost:3306`                                         |
| pagoPA payment information mock      | `http://mock-server-pagopa-ecommerce:3000`                          | `http://localhost:8010`                                  |
| Notification mock                    | `http://mock-server-apim:3000/api/v1/messages-sending/internal`     | `http://localhost:8007/api/v1/messages-sending/internal` |

Kafka uses `SASL_PLAINTEXT`, mechanism `PLAIN`, username `$ConnectionString` and
the emulator connection string. Use `Endpoint=sb://eventhubs` from containers
and `Endpoint=sb://localhost` from the host, with
`SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=SAS_KEY_VALUE;UseDevelopmentEmulator=true;`.

The payment flow uses the existing topics:

`reminder-messages` (binary Avro) -> MongoDB -> Quartz -> pagoPA mock ->
`message-reminder-send` (JSON) -> notification mock.

`payment-updates` accepts JSON payment events with `source=payments`; a matching
`messageId` marks the stored message as paid. The payment-updater application
does not need to be started to test reminder independently.

#### Local payment fixtures

Incoming messages must have `content_type=PAYMENT`, `feature_level_type=ADVANCED`
and an allowed `senderServiceId` (by default `01JXJ24SKJ93413KX6RRSNMCH1`).
The message schema is in `src/main/resources/avro/message.json`; `dueDate` is an
epoch timestamp in milliseconds. Use the same calendar date returned by the
payment information mock, as reminder compares the two dates before sending.
Publish fixtures using this legacy schema directly to `reminder-messages`;
the newer ETL `Message` schema is different and is not a compatible input.

#### Publish JSON from Kafka UI

From the repository root:

```bash
docker compose up --build -d kafka-ui
```

Open `http://localhost:8002`, select cluster `local`, topic `reminder-messages`,
then **Produce Message**. Select **ReminderAvro** as the value serializer
(the default for this topic). Keep the key empty and headers `{}`, paste the
complete JSON record, and publish.

The local Kafka UI build keeps the pinned upstream version and adds a small
`ReminderAvro` plugin. It uses the mounted legacy schema to convert JSON into
raw Avro bytes, without a Schema Registry, Confluent header or Avro container.
Plain enum values such as `"feature_level_type": "ADVANCED"` and
`"content_type": "PAYMENT"` are accepted; canonical Avro JSON union wrappers
are accepted too. All schema fields must be included. New payload IDs are
needed when repeating tests because existing IDs are not inserted again.

Only values on `reminder-messages` and payment-updater's `messages-payments`
use this plugin, as both use the same legacy schema; `payment-updates` and
`message-reminder-send` remain JSON strings. The plugin also decodes raw Avro
when browsing the topic. Older messages published as plain JSON will still
show a deserialization warning and are not converted retroactively.

The plugin is compiled and tested against the libraries inside the pinned
Kafka UI image during `docker compose build kafka-ui`; no extra runtime
dependencies are downloaded.

#### Payment mock responses

The shared pagoPA mock includes two reminder-specific RPT IDs, without changing
its existing default responses:

| RPT ID                          | Payee fiscal code | Notice number        | Due date       | Expected notification   |
| ------------------------------- | ----------------- | -------------------- | -------------- | ----------------------- |
| `99999999999000000000000000001` | `99999999999`     | `000000000000000001` | Today + 7 days | `REMINDER_PAYMENT`      |
| `99999999999000000000000000002` | `99999999999`     | `000000000000000002` | Tomorrow       | `REMINDER_PAYMENT_LAST` |

The notification mock accepts `POST /notify` and returns `204`; no real push
notification is sent.
Inspect notification bodies and HTTP results at
`http://localhost:8007/mockoon-admin/logs?limit=100`. Logs are paginated; requesting
only the default ten entries can hide notifications behind healthcheck traffic.

Local settings use calendar-day semantics (`TEST_ACTIVE=false`), a 13-day
selection window, no minimum wait between reminders (`PAYMENT_DAY=0`), and a
maximum of four reminders. Quartz checks every minute. Reminder and the pagoPA
mock use the `Europe/Rome` timezone.

To inspect processing:

```bash
docker compose --profile reminder logs -f reminder mock-server-pagopa-ecommerce mock-server-apim
```

To stop reminder without stopping the shared monorepo services:

```bash
docker compose --profile reminder stop reminder
```

### Run tests

`MessageKafkaConsumerTest` starts an embedded Kafka broker on `localhost:9092`.
Stop the Event Hubs emulator before running those tests to avoid a port conflict.

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
