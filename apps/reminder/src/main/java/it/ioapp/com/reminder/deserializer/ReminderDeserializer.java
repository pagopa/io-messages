package it.ioapp.com.reminder.deserializer;

import org.apache.kafka.common.serialization.Deserializer;
import org.springframework.kafka.support.serializer.DeserializationException;

import com.fasterxml.jackson.databind.ObjectMapper;

import it.ioapp.com.reminder.model.Reminder;
import lombok.extern.slf4j.Slf4j;
@Slf4j
public class ReminderDeserializer implements Deserializer<Reminder> {

	ObjectMapper mapper;

	public ReminderDeserializer(ObjectMapper mapper) {
		this.mapper = mapper;
	}


	@Override
	public Reminder deserialize(String s, byte[] bytes) {

		Reminder reminder = null;
		try {
			reminder = mapper.readValue(bytes, Reminder.class);
		} catch (Exception e) {
			log.error("Error in deserializing the Reminder for consumer message-send|ERROR=" + e.getMessage());
			throw new DeserializationException(
					"Error in deserializing the Reminder for consumer  message-send|ERROR=" + e.getMessage(), bytes, false, e);
		}
		return reminder;
	}
}
