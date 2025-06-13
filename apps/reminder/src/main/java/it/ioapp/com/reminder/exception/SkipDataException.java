package it.ioapp.com.reminder.exception;

import lombok.Getter;
import org.springframework.kafka.KafkaException;

public class SkipDataException extends KafkaException {

  @Getter private Object skippedData;

  public SkipDataException(String message, Object skippedData) {
    super(message);
    this.skippedData = skippedData;
  }
}
