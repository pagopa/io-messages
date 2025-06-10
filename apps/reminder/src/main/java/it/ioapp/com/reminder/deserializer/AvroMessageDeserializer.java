package it.ioapp.com.reminder.deserializer;

import org.apache.avro.io.DatumReader;
import org.apache.avro.io.Decoder;
import org.apache.avro.io.DecoderFactory;
import org.apache.avro.specific.SpecificDatumReader;
import org.apache.commons.lang3.StringUtils;
import org.apache.kafka.common.serialization.Deserializer;

import dto.MessageContentType;
import dto.message;
import it.ioapp.com.reminder.exception.AvroDeserializerException;
import it.ioapp.com.reminder.exception.SkipDataException;
import it.ioapp.com.reminder.exception.UnexpectedDataException;
import it.ioapp.com.reminder.model.Reminder;
import it.ioapp.com.reminder.util.ReminderMapper;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class AvroMessageDeserializer implements Deserializer<Reminder> {

	private final DatumReader<message> reader = new SpecificDatumReader<>(message.class);


	@Override
	public Reminder deserialize(String topic, byte[] bytes) {
		Reminder returnObject = null;
		if (bytes == null)
			throw new AvroDeserializerException(
					"Error in deserializing the Reminder for consumer message|bytes=null", bytes);
			try {
				Decoder decoder = DecoderFactory.get().binaryDecoder(bytes, null);
				message avroMessage = reader.read(null, decoder);
				returnObject = ReminderMapper.messageToReminder(avroMessage);
			} catch (Exception e) {
				log.error("Error in deserializing the Reminder for consumer message|ERROR=" + e.getMessage());
				throw new AvroDeserializerException(
						"Error in deserializing the Reminder for consumer message|ERROR=" + e.getMessage(), bytes);
			}
			if (returnObject == null || returnObject.getContent_type() == null) {
				throw new SkipDataException("Skip Data that not satisfies constraints", returnObject);
			}
			if (returnObject.getContent_type().equals(MessageContentType.PAYMENT)
					&& (StringUtils.isEmpty(returnObject.getContent_paymentData_noticeNumber()) || StringUtils.isEmpty(returnObject.getContent_paymentData_payeeFiscalCode())))
				throw new UnexpectedDataException("Unexpected Data", returnObject);

			return returnObject;
		}
	}
