package it.ioapp.com.reminder.deserializer;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.ioapp.com.reminder.dto.PaymentMessage;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.serialization.Deserializer;
import org.springframework.kafka.support.serializer.DeserializationException;

@Slf4j
public class PaymentMessageDeserializer implements Deserializer<PaymentMessage> {

  ObjectMapper mapper;

  public PaymentMessageDeserializer(ObjectMapper mapper) {
    this.mapper = mapper;
  }

  @Override
  public PaymentMessage deserialize(String s, byte[] bytes) {
    PaymentMessage paymentMessage = null;
    try {
      paymentMessage = mapper.readValue(bytes, PaymentMessage.class);
    } catch (Exception e) {
      log.error(
          "Error in deserializing the PaymentMessage for consumer payment-updates|ERROR="
              + e.getMessage());
      throw new DeserializationException(
          "Error in deserializing the PaymentMessage for consumer payment-updates|ERROR="
              + e.getMessage(),
          bytes,
          false,
          e);
    }
    return paymentMessage;
  }
}
