package it.ioapp.com.paymentupdater.producer;

import java.util.concurrent.ExecutionException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class PaymentProducer {

  public String sendPaymentUpdate(
      String paymentMessage, KafkaTemplate<String, String> kafkaTemplatePayments, String topic)
      throws InterruptedException, ExecutionException {
    log.info("Send to payment-updates topic: {} ", topic);
    kafkaTemplatePayments.send(topic, paymentMessage).get();
    return paymentMessage;
  }
}
