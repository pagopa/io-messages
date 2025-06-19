package it.gov.pagopa.paymentupdater.config;

import org.junit.Before;
import org.junit.Test;
import org.junit.jupiter.api.Assertions;
import org.junit.runner.RunWith;
import org.springframework.test.context.junit4.SpringRunner;

import java.time.LocalDateTime;
import java.util.Map;

@RunWith(SpringRunner.class)
public class IntegerToLocalDateTimeMongoDbConverterTest {

  IntegerToLocalDateTimeMongoDbConverter converter;

  @Before
  public void init() {
    converter = new IntegerToLocalDateTimeMongoDbConverter();
  }

  @Test
  public void ShouldConvertALongToALocalDateTime() {
    Map.of(
      0, LocalDateTime.parse("1970-01-01T00:00"),
      2147483647, LocalDateTime.parse("2038-01-19T03:14:07"),
      1694521051, LocalDateTime.parse("2023-09-12T12:17:31")
    ).forEach((k, v) -> {
      Assertions.assertEquals(v, converter.convert(k));
    });
  }
}
