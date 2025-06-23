FROM public.ecr.aws/docker/library/maven:3.8.3-eclipse-temurin-17@sha256:af8068725ab22efc4f46dee1740684a7108dca39824aeaf8dd97b2176016d175 AS builder

COPY . .

RUN mvn clean package -DskipTests -Dfmt.skip
RUN mkdir -p target/dependency && (cd target/dependency; jar -xf ../*.jar)

FROM public.ecr.aws/docker/library/eclipse-temurin:17-jdk-alpine@sha256:ca5c0c9763d21cf1617cb68ef8c17228a202cd0358fa6d7510a1bbdbd49c74da

RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --chown=spring:spring --from=builder target/dependency/BOOT-INF/lib /app/lib
COPY --chown=spring:spring --from=builder target/dependency/META-INF /app/META-INF
COPY --chown=spring:spring --from=builder target/dependency/BOOT-INF/classes /app
COPY --chown=spring:spring --from=builder target/agent/applicationinsights-agent.jar /app

ENTRYPOINT ["java","-javaagent:app/applicationinsights-agent.jar", "-cp","app:app/lib/*","it.ioapp.com.paymentupdater.Application"]
