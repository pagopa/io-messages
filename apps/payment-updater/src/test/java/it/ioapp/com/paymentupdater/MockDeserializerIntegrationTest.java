package it.ioapp.com.paymentupdater;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.avro.io.DatumWriter;
import org.apache.avro.io.Encoder;
import org.apache.avro.io.EncoderFactory;
import org.apache.avro.specific.SpecificDatumWriter;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.serialization.BytesDeserializer;
import org.apache.kafka.common.serialization.LongDeserializer;
import org.junit.Test;
import org.junit.jupiter.api.Assertions;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.support.serializer.DeserializationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit4.SpringRunner;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.exc.StreamReadException;
import com.fasterxml.jackson.databind.DatabindException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import dto.message;
import it.ioapp.com.paymentupdater.deserialize.AvroMessageDeserializer;
import it.ioapp.com.paymentupdater.deserialize.PaymentRootDeserializer;
import it.ioapp.com.paymentupdater.dto.payments.PaymentRoot;
import it.ioapp.com.paymentupdater.exception.AvroDeserializerException;
import it.ioapp.com.paymentupdater.exception.SkipDataException;
import it.ioapp.com.paymentupdater.exception.UnexpectedDataException;
import it.ioapp.com.paymentupdater.model.JsonLoader;
import it.ioapp.com.paymentupdater.model.Payment;
import tech.allegro.schema.json2avro.converter.JsonAvroConverter;

@SpringBootTest(classes = Application.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@RunWith(SpringRunner.class)
@AutoConfigureMockMvc
public class MockDeserializerIntegrationTest extends AbstractMock {

	@MockBean
	JsonAvroConverter converter;


	@Autowired
	CommonErrorHandler commonErrorHandler;

	@Mock
	ObjectMapper mapper;

	@InjectMocks
	AvroMessageDeserializer avroMessageDeserializer = null;

	@InjectMocks
	PaymentRootDeserializer paymentDeserializer = null;

	@Autowired
	@Qualifier("messageSchema")
	JsonLoader messageSchema;

	@Test
	public void test_messageDeserialize_ok() throws JsonMappingException, JsonProcessingException, IOException {
		avroMessageDeserializer = new AvroMessageDeserializer();

		message paymentMessage = selectMessageMockObject("FULL");
		DatumWriter<message> writer = new SpecificDatumWriter<>(message.class);

		ByteArrayOutputStream bos = new ByteArrayOutputStream();
		Encoder encoder = EncoderFactory.get().binaryEncoder(bos, null);
		writer.write(paymentMessage, encoder);
		encoder.flush();
		Payment payment = avroMessageDeserializer.deserialize(null, bos.toByteArray());
		Assertions.assertNotNull(payment);
	}

	@Test
	public void test_messageDeserialize_ko() {
		Assertions.assertThrows(AvroDeserializerException.class,
				() -> avroMessageDeserializer.deserialize(null, messageSchema.getJsonString().getBytes()));
	}

	@Test
	public void test_paymentDeserialize_OK() throws StreamReadException, DatabindException, IOException {
		PaymentRoot paymentRoot = getPaymentRootObject();

		byte[] byteArray = getPaymentRootString().getBytes();

		paymentDeserializer = new PaymentRootDeserializer(mapper);
		Mockito.when(mapper.readValue(byteArray, PaymentRoot.class)).thenReturn(paymentRoot);
		PaymentRoot deserialized = paymentDeserializer.deserialize(null, byteArray);
		Assertions.assertNotNull(deserialized);
	}

	@Test
	public void test_paymentDeserialize_KO() throws StreamReadException, DatabindException, IOException {
		String s = "ko";
		byte[] byteArray = s.getBytes();
		paymentDeserializer = new PaymentRootDeserializer(null);
		Mockito.when(converter.convertToJson(Mockito.any(), Mockito.anyString())).thenReturn(byteArray);
		Assertions.assertThrows(DeserializationException.class, () -> paymentDeserializer.deserialize(null, byteArray));
	}

	protected void mockKafkaDeserializationErrorHandler(Exception unexpectedException, boolean recordIsNotNull) {
		List<ConsumerRecord<?, ?>> records = new ArrayList<>();

		if (recordIsNotNull) {
			ConsumerRecord<?, ?> record = new ConsumerRecord<>("message", 0, 439198, null, null);
			records.add(record);
		}

		Map<String, Object> props = new HashMap<>();
		props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "PLAINTEXT://localhost:9065");
		props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
		props.put(ConsumerConfig.GROUP_ID_CONFIG, "baeldung");
		props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, BytesDeserializer.class.getName());
		props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, LongDeserializer.class.getName());
		Consumer<?, ?> consumer = new KafkaConsumer<>(props);
		Collection<TopicPartition> assignment = new ArrayList<>();
		assignment.add(new TopicPartition("message", 0));
		consumer.assign(assignment);

		commonErrorHandler.handleRemaining(unexpectedException, (List<ConsumerRecord<?, ?>>) records, consumer, null);
	}

	@Test
	public void test_DeserializationException() {
		Exception deserializationException = new DeserializationException("Deserialization Exception",
				"Deserialization Exception".getBytes(), false, new Exception());
		mockKafkaDeserializationErrorHandler(deserializationException, true);
		Assertions.assertTrue(true);
	}

	@Test
	public void test_AvroDeserializerException() {
		Exception avroDeserializerException = new AvroDeserializerException("Avro deserializer exception!",
				"Avro deserializer exception!".getBytes());
		mockKafkaDeserializationErrorHandler(avroDeserializerException, true);
		Assertions.assertTrue(true);
	}

	@Test
	public void test_UnexpectedDataException() {
		Exception unexpectedDataException = new UnexpectedDataException("Unexpected data exception!", new Object());
		mockKafkaDeserializationErrorHandler(unexpectedDataException, true);
		Assertions.assertTrue(true);
	}

	@Test
	public void test_SkipDataException() {
		Exception skipDataException = new SkipDataException("Skip data exception!", new Object());
		mockKafkaDeserializationErrorHandler(skipDataException, true);
		Assertions.assertTrue(true);
	}

	@Test
	public void mockKafkaDeserializationErrorHandlerConsumerRecordIsNull() {
		Exception avroDeserializerException = new AvroDeserializerException("Avro deserializer exception!",
				"Avro deserializer exception!".getBytes());
		mockKafkaDeserializationErrorHandler(avroDeserializerException, false);
		Assertions.assertTrue(true);
	}
}
