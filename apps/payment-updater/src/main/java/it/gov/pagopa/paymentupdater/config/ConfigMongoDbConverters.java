package it.gov.pagopa.paymentupdater.config;

import java.util.Arrays;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

@Configuration
public class ConfigMongoDbConverters {

  @Bean
  public MongoCustomConversions mongoCustomConversions() {

    return new MongoCustomConversions(
      Arrays.asList(
        new LongToLocalDateTimeMongoDbConverter(),
        new IntegerToLocalDateTimeMongoDbConverter()));
  }
}
