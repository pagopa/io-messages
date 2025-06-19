package it.ioapp.com.paymentupdater.deserialize;

import org.apache.avro.io.DatumReader;
import org.apache.avro.io.Decoder;
import org.apache.avro.io.DecoderFactory;
import org.apache.avro.specific.SpecificDatumReader;
import org.apache.commons.lang3.StringUtils;
import org.apache.kafka.common.serialization.Deserializer;
import dto.MessageContentType;
import dto.message;
import it.ioapp.com.paymentupdater.exception.AvroDeserializerException;
import it.ioapp.com.paymentupdater.exception.SkipDataException;
import it.ioapp.com.paymentupdater.exception.UnexpectedDataException;
import it.ioapp.com.paymentupdater.model.Payment;
import it.ioapp.com.paymentupdater.util.MessagePaymentMapper;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class AvroMessageDeserializer implements Deserializer<Payment> {

	private final DatumReader<message> reader = new SpecificDatumReader<>(message.class);

	@Override
	public Payment deserialize(String topic, byte[] bytes) {
		Payment returnObject = null;
		if (bytes == null)
			throw new AvroDeserializerException(
					"Error in deserializing the Reminder for consumer message|bytes=null", bytes);
		try {
			Decoder decoder = DecoderFactory.get().binaryDecoder(bytes, null);
			message avroMessage = reader.read(null, decoder);
			returnObject = MessagePaymentMapper.messageToPayment(avroMessage);
		} catch (Exception e) {
			log.error("Error in deserializing the Reminder for consumer message|ERROR=" + e.getMessage());
			throw new AvroDeserializerException(
					"Error in deserializing the Reminder for consumer message|ERROR=" + e.getMessage(), bytes);
		}
		if (returnObject == null || returnObject.getContent_type() == null) {
			throw new SkipDataException("Skip Data that not satisfies constraints", returnObject);
		}

		if (returnObject.getContent_type().equals(MessageContentType.PAYMENT)
				&& (StringUtils.isEmpty(returnObject.getContent_paymentData_noticeNumber())
						|| StringUtils.isEmpty(returnObject.getContent_paymentData_payeeFiscalCode())))
			throw new UnexpectedDataException("Unexpected Data", returnObject);
		return returnObject;
	}

}
