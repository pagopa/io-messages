package it.ioapp.com.reminder.exception;

import lombok.Getter;
import org.springframework.kafka.KafkaException;

public class AvroDeserializerException extends KafkaException {

  @Getter private byte[] data;

  public AvroDeserializerException(String message, byte[] data) {
    super(message);
    this.data = data;
  }
}
