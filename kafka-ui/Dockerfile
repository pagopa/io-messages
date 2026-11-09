FROM provectuslabs/kafka-ui:latest@sha256:8f2ff02d64b0a7a2b71b6b3b3148b85f66d00ec20ad40c30bdcd415d46d31818 AS kafka-ui

FROM public.ecr.aws/docker/library/maven:3.8.3-eclipse-temurin-17@sha256:af8068725ab22efc4f46dee1740684a7108dca39824aeaf8dd97b2176016d175 AS builder

WORKDIR /build
COPY --from=kafka-ui /kafka-ui-api.jar .
RUN jar xf kafka-ui-api.jar BOOT-INF/lib BOOT-INF/classes

COPY kafka-ui/*.java ./src/
COPY apps/reminder/src/main/resources/avro/message.json ./message.json
RUN mkdir classes \
    && javac --release 17 -cp 'BOOT-INF/classes:BOOT-INF/lib/*' -d classes src/*.java \
    && java -ea -cp 'classes:BOOT-INF/classes:BOOT-INF/lib/*' it.ioapp.com.local.ReminderAvroSerdeTest message.json \
    && jar --create --file reminder-avro-serde.jar -C classes it/ioapp/com/local/ReminderAvroSerde.class

FROM kafka-ui
COPY --from=builder /build/reminder-avro-serde.jar /etc/kafka-ui/serdes/reminder-avro-serde.jar
