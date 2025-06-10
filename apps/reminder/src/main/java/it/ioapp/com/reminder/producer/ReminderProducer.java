package it.ioapp.com.reminder.producer;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;
import org.springframework.util.concurrent.ListenableFuture;
import org.springframework.util.concurrent.ListenableFutureCallback;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import it.ioapp.com.reminder.model.Reminder;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class ReminderProducer {

	public void sendReminder(Reminder reminder, KafkaTemplate<String, String> kafkaTemplatePayments, ObjectMapper mapper, String topic) throws JsonProcessingException {

		String json = mapper.writeValueAsString(reminder);
		ListenableFuture<SendResult<String, String>> future = kafkaTemplatePayments.send(topic, json);
		future.addCallback(
				new ListenableFutureCallback<SendResult<String, String>>() {
					@Override
					public void onSuccess(SendResult<String, String> result) {
						log.debug("Sent message=[{}] with offset=[{}] " +  json + "    " + result.getRecordMetadata().offset());
					}
					@Override
					public void onFailure(Throwable ex) {
						log.debug("Unable to send message=[{}] due to : {}" +  json + "    " + ex.getMessage());
					}
				});
	}

}

