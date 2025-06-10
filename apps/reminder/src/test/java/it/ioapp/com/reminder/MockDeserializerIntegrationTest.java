package it.ioapp.com.reminder;

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
import org.junit.Before;
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

import com.fasterxml.jackson.core.exc.StreamReadException;
import com.fasterxml.jackson.databind.DatabindException;
import com.fasterxml.jackson.databind.ObjectMapper;

import dto.message;
import dto.messageStatus;
import it.ioapp.com.reminder.deserializer.AvroMessageDeserializer;
import it.ioapp.com.reminder.deserializer.AvroMessageStatusDeserializer;
import it.ioapp.com.reminder.deserializer.PaymentMessageDeserializer;
import it.ioapp.com.reminder.deserializer.ReminderDeserializer;
import it.ioapp.com.reminder.dto.PaymentMessage;
import it.ioapp.com.reminder.exception.AvroDeserializerException;
import it.ioapp.com.reminder.exception.SkipDataException;
import it.ioapp.com.reminder.exception.UnexpectedDataException;
import it.ioapp.com.reminder.model.JsonLoader;
import it.ioapp.com.reminder.model.Reminder;
import tech.allegro.schema.json2avro.converter.JsonAvroConverter;

@SpringBootTest(classes = Application.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@RunWith(SpringRunner.class)
@AutoConfigureMockMvc
public class MockDeserializerIntegrationTest extends AbstractMock {

	@MockBean
	JsonAvroConverter converter;

	@Mock
	ObjectMapper mapper;

	@InjectMocks
	AvroMessageDeserializer avroMessageDeserializer = null;

	@InjectMocks
	AvroMessageStatusDeserializer avroMessageStatusDeserializer = null;

	@InjectMocks
	PaymentMessageDeserializer paymentMessageDeserializer = null;

	@InjectMocks
	ReminderDeserializer reminderDeserializer = null;

	@Autowired
	CommonErrorHandler commonErrorHandler;

	@Autowired
	@Qualifier("messageSchema")
	JsonLoader messageSchema;

	@Autowired
	@Qualifier("messageStatusSchema")
	JsonLoader messageStatusSchema;

	@Before
	public void setUp() {
		before();
	}

	@Test
	public void test_messageDeserialize_ok() throws IOException {

		avroMessageDeserializer = new AvroMessageDeserializer();
		message mess = selectMessageMockObject("", "1", "GENERIC", "AAABBB77Y66A444A", "123456");
		DatumWriter<message> writer = new SpecificDatumWriter<>(
				message.class);
		ByteArrayOutputStream bos = new ByteArrayOutputStream();
		Encoder encoder = EncoderFactory.get().binaryEncoder(bos, null);
		writer.write(mess, encoder);
		encoder.flush();
		Reminder rem = avroMessageDeserializer.deserialize(null, bos.toByteArray());
		Assertions.assertNotNull(rem);
	}

	@Test
	public void test_messageDeserialize_ko() {
		Assertions.assertThrows(AvroDeserializerException.class,
				() -> avroMessageDeserializer.deserialize(null, messageSchema.getJsonString().getBytes()));
	}

	@Test
	public void test_messageDeserialize_UnexpectedDataExceptionWithFiscalCode() throws IOException {
		avroMessageDeserializer = new AvroMessageDeserializer();
		message mess = selectMessageMockObject("", "1", "PAYMENT", "AAABBB77Y66A444A", "");
		DatumWriter<message> writer = new SpecificDatumWriter<>(
				message.class);
		ByteArrayOutputStream bos = new ByteArrayOutputStream();
		Encoder encoder = EncoderFactory.get().binaryEncoder(bos, null);
		writer.write(mess, encoder);
		encoder.flush();
		Assertions.assertThrows(UnexpectedDataException.class,
				() -> avroMessageDeserializer.deserialize(null, bos.toByteArray()));
		Assertions.assertTrue(true);
	}

	@Test
	public void test_messageStatusDeserialize_ok() throws IOException {
		avroMessageStatusDeserializer = new AvroMessageStatusDeserializer();
		messageStatus messStatus = selectMessageStatusMockObject("1", true);
		DatumWriter<messageStatus> writer = new SpecificDatumWriter<>(
				messageStatus.class);
		ByteArrayOutputStream bos = new ByteArrayOutputStream();
		Encoder encoder = EncoderFactory.get().binaryEncoder(bos, null);
		writer.write(messStatus, encoder);
		encoder.flush();
		messageStatus rem = avroMessageStatusDeserializer.deserialize(null, bos.toByteArray());
		Assertions.assertNotNull(rem);
	}

	@Test
	public void test_messageStatusDeserialize_ko() {
		Assertions.assertThrows(AvroDeserializerException.class,
				() -> avroMessageStatusDeserializer.deserialize(null, messageStatusSchema.getJsonString().getBytes()));
	}

	@Test
	public void test_paymentDeserialize_OK() throws StreamReadException, DatabindException, IOException {
		byte[] byteArrray = "".getBytes();
		paymentMessageDeserializer = new PaymentMessageDeserializer(mapper);
		Mockito.when(converter.convertToJson(Mockito.any(), Mockito.anyString())).thenReturn(byteArrray);
		Mockito.when(mapper.readValue(byteArrray, PaymentMessage.class)).thenReturn(new PaymentMessage());
		paymentMessageDeserializer.deserialize(null, byteArrray);
		Assertions.assertTrue(true);
	}

	@Test
	public void test_paymentDeserialize_KO() throws StreamReadException, DatabindException, IOException {
		paymentMessageDeserializer = new PaymentMessageDeserializer(null);
		Assertions.assertThrows(DeserializationException.class,
				() -> paymentMessageDeserializer.deserialize(null, "".getBytes()));
	}

	@Test
	public void test_reminderDeserialize_OK() throws StreamReadException, DatabindException, IOException {
		byte[] byteArrray = "".getBytes();
		reminderDeserializer = new ReminderDeserializer(mapper);
		Mockito.when(converter.convertToJson(Mockito.any(), Mockito.anyString())).thenReturn(byteArrray);
		Mockito.when(mapper.readValue(byteArrray, Reminder.class)).thenReturn(new Reminder());
		reminderDeserializer.deserialize(null, byteArrray);
		Assertions.assertTrue(true);
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

		// commonErrorHandler = (CommonErrorHandler)
		// ApplicationContextProvider.getBean("commonErrorHandler");
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
