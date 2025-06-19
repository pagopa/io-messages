package it.gov.pagopa.paymentupdater.producer;

import java.util.concurrent.ExecutionException;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class PaymentProducer {


	public String sendPaymentUpdate(String paymentMessage, KafkaTemplate<String, String> kafkaTemplatePayments,	String topic) throws InterruptedException, ExecutionException {
		log.info("Send to payment-updates topic: {} ", topic);
		kafkaTemplatePayments.send(topic, paymentMessage).get();
		return paymentMessage;
	}

}
