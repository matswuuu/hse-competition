package dev.matswuuu.hse.purchase;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReceiptClientTest {

    @Test
    void parsesFnsReceiptInKopecks() {
        var json = JsonMapper.builder().build().readTree("""
                {"dateTime":"2026-10-18T19:42:00","retailPlace":"Пятёрочка","totalSum":34993,
                 "fiscalDriveNumber":"9282440300682838","fiscalDocumentNumber":46534,"fiscalSign":1273019065,
                 "items":[
                   {"name":"МОЛОКО 3,2% 930МЛ","price":8999,"quantity":2,"sum":17998},
                   {"name":"БАНАНЫ ВЕС","price":14990,"quantity":0.532,"sum":7975},
                   {"name":"","price":100,"quantity":1,"sum":100}
                 ]}
                """);
        var receipt = ReceiptClient.toReceipt(json, Map.of());

        assertThat(receipt.total()).isEqualByComparingTo("349.93");
        assertThat(receipt.store()).isEqualTo("Пятёрочка");
        assertThat(receipt.dateTime()).isEqualTo(LocalDateTime.of(2026, 10, 18, 19, 42));
        assertThat(receipt.fiscalKey()).isEqualTo("9282440300682838/46534/1273019065");
        assertThat(receipt.lines()).hasSize(2);
        assertThat(receipt.lines().getFirst().price()).isEqualByComparingTo(new BigDecimal("89.99"));
        assertThat(receipt.lines().get(1).quantity()).isEqualTo(0.532);
    }

    @Test
    void fallsBackToQrTimeAndKey() {
        var json = JsonMapper.builder().build().readTree("{\"items\":[{\"name\":\"Хлеб\",\"sum\":5000}]}");
        var receipt = ReceiptClient.toReceipt(json,
                ReceiptClient.parseQr("t=20261018T1942&s=50.00&fn=111&i=22&fp=333&n=1"));

        assertThat(receipt.dateTime()).isEqualTo(LocalDateTime.of(2026, 10, 18, 19, 42));
        assertThat(receipt.fiscalKey()).isEqualTo("111/22/333");
        assertThat(receipt.total()).isEqualByComparingTo("50.00");
    }

    @Test
    void rejectsNonReceiptQr() {
        assertThatThrownBy(() -> ReceiptClient.parseQr("https://example.com"))
                .isInstanceOf(ResponseStatusException.class);
    }
}
