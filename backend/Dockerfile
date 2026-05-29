# syntax=docker/dockerfile:1.7

# ---- Build stage ---------------------------------------------------------
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY mvnw ./
COPY .mvn .mvn
COPY pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src src
RUN ./mvnw -B -DskipTests -Dquarkus.package.jar.type=fast-jar package

# ---- Runtime stage -------------------------------------------------------
FROM eclipse-temurin:21-jre

# Patch base OS packages and remove pebble (Go-based init wrapper we don't
# use; it ships with eclipse-temurin and routinely carries Go stdlib CVEs).
RUN apt-get update \
 && apt-get -y upgrade \
 && rm -f /usr/bin/pebble \
 && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1001 app && useradd -u 1001 -g 1001 -ms /sbin/nologin app

WORKDIR /deployments
COPY --from=build --chown=1001:1001 /app/target/quarkus-app/lib/      ./lib/
COPY --from=build --chown=1001:1001 /app/target/quarkus-app/*.jar     ./
COPY --from=build --chown=1001:1001 /app/target/quarkus-app/app/      ./app/
COPY --from=build --chown=1001:1001 /app/target/quarkus-app/quarkus/  ./quarkus/

USER 1001
EXPOSE 8080

ENV LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    JAVA_OPTS_APPEND="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"

ENTRYPOINT ["sh","-c","exec java $JAVA_OPTS_APPEND -jar /deployments/quarkus-run.jar"]
