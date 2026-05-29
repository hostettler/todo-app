package com.example.todo.config;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.Optional;

/**
 * Refuses to start if the CORS configuration contains a wildcard origin
 * (api-security spec, "Wildcard origin is rejected at startup").
 *
 * <p>The default Quarkus CORS configuration would silently accept {@code *},
 * which is incompatible with credentialed requests and disallowed by our
 * security baseline.  Failing fast prevents a misconfigured deployment from
 * ever serving traffic.
 */
@ApplicationScoped
public class CorsConfigValidator {

    private static final Logger LOG = Logger.getLogger(CorsConfigValidator.class);

    @ConfigProperty(name = "quarkus.http.cors.origins")
    Optional<String> originsRaw;

    void onStart(@Observes StartupEvent event) {
        String origins = originsRaw.orElse("");
        for (String origin : origins.split(",")) {
            String o = origin.trim();
            if (o.equals("*") || o.equals("/.*/")) {
                LOG.errorf("Invalid CORS configuration: wildcard origin '%s' is not allowed", o);
                throw new IllegalStateException(
                    "CORS configuration error: wildcard origin '" + o
                        + "' is not allowed; configure APP_CORS_ORIGINS with an explicit allow-list");
            }
        }
        LOG.infof("CORS allow-list validated: [%s]", origins);
    }
}
