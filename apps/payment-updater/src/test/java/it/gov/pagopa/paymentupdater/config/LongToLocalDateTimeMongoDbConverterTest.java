package it.gov.pagopa.paymentupdater.config;

import org.junit.Before;
import org.junit.Test;
import org.junit.jupiter.api.Assertions;
import org.junit.runner.RunWith;
import org.springframework.test.context.junit4.SpringRunner;

import java.time.LocalDateTime;
import java.util.Map;

@RunWith(SpringRunner.class)
public class LongToLocalDateTimeMongoDbConverterTest {

  LongToLocalDateTimeMongoDbConverter converter;

  @Before
  public void init() {
    converter = new LongToLocalDateTimeMongoDbConverter();
  }

  @Test
  public void ShouldConvertALongToALocalDateTime() {
    Map.of(
      0L, LocalDateTime.parse("1970-01-01T00:00"),
      9999999999L, LocalDateTime.parse("2286-11-20T17:46:39"),
      9999999999999L, LocalDateTime.parse("2286-11-20T17:46:39"),
      9999999999999999L, LocalDateTime.parse("2286-11-20T17:46:39"),
      1694521051L, LocalDateTime.parse("2023-09-12T12:17:31"),
      1694521051000L, LocalDateTime.parse("2023-09-12T12:17:31"),
      1694521051000000L, LocalDateTime.parse("2023-09-12T12:17:31")
    ).forEach((k, v) -> {
      Assertions.assertEquals(v, converter.convert(k));
    });
  }
}
