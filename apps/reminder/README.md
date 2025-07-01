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
