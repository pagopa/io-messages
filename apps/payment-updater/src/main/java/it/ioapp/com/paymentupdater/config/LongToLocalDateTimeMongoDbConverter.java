package it.ioapp.com.paymentupdater.config;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;

@ReadingConverter
public class LongToLocalDateTimeMongoDbConverter implements Converter<Long, LocalDateTime> {

  @Override
  public LocalDateTime convert(Long source) {
    return Optional.ofNullable(source).map(date -> {
      if (date > 9999999999L) {
        // timestamp greater than 10 digits are in milliseconds or microseconds
        // we have to take just the seconds because the greatest 10 digits seconds
        // based timestamp (9999999999) will represent Saturday 20 November 2286 17:46:39
        String stringified = String.valueOf(date);
        stringified = stringified.substring(0, 10);
        date = Long.valueOf(stringified);
      }
      return LocalDateTime.ofEpochSecond(date,0, ZoneOffset.UTC);
    }).orElse(null);
  }
}
