package it.ioapp.com.reminder.consumer;

import java.util.Objects;
import java.util.concurrent.CountDownLatch;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import it.ioapp.com.reminder.dto.PaymentMessage;
import it.ioapp.com.reminder.service.ReminderService;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class PaymentUpdatesKafkaConsumer {

	@Autowired
	ReminderService reminderService;

	private CountDownLatch latch = new CountDownLatch(1);
	private String payload = "";

	@KafkaListener(topics = "${kafka.payment}", groupId = "payment-updates-shared", containerFactory = "kafkaListenerContainerFactoryPaymentMessage", autoStartup = "${payment.auto.start}")
	public void paymentUpdatesKafkaListener(PaymentMessage message) {
		if (Objects.nonNull(message)) {
			log.info("Received payment-updates: {}", message);
			payload = message.toString();

			if ("payments".equalsIgnoreCase(message.getSource())) {

				reminderService.findById(message.getMessageId()).ifPresent(reminderToUpdate -> {
					reminderToUpdate.setPaidFlag(true);
					reminderToUpdate.setPaidDate(message.getPaymentDateTime());
					reminderService.save(reminderToUpdate);
				});

			}
		}
		this.latch.countDown();
	}

	public CountDownLatch getLatch() {
		return latch;
	}

	public String getPayload() {
		return payload;
	}
}
