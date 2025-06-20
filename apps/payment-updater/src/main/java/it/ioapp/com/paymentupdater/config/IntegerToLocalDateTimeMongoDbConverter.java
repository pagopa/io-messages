package it.ioapp.com.paymentupdater.config;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;

@ReadingConverter
public class IntegerToLocalDateTimeMongoDbConverter implements Converter<Integer, LocalDateTime> {

  @Override
  public LocalDateTime convert(Integer source) {
    return Optional.ofNullable(source)
        .map(date -> LocalDateTime.ofEpochSecond(date, 0, ZoneOffset.UTC))
        .orElse(null);
  }
}
