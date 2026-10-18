package dev.matswuuu.hse.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

/** Real Tomcat, since forwarded headers are applied by its valve, which MockMvc skips. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ProxiedSameOriginTest {

    @LocalServerPort
    private int port;

    @Test
    void siteOriginBehindProxyIsNotTreatedAsCrossOrigin() throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/users/login"))
                .header("Origin", "https://site.example")
                .header("X-Forwarded-Proto", "https")
                .header("X-Forwarded-Host", "site.example")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{}"))
                .build();

        var response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());

        // Reaches the controller (validation rejects the empty body) instead of the CORS filter's 403.
        assertThat(response.statusCode()).isNotEqualTo(403);
    }
}
