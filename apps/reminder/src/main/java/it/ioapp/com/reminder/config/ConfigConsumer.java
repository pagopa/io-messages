package it.ioapp.com.reminder.config;

import java.util.Map;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.listener.CommonDelegatingErrorHandler;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.DeserializationException;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.util.backoff.FixedBackOff;

import com.fasterxml.jackson.databind.ObjectMapper;

import dto.messageStatus;
import it.ioapp.com.reminder.consumer.MessageKafkaConsumer;
import it.ioapp.com.reminder.consumer.MessageStatusKafkaConsumer;
import it.ioapp.com.reminder.consumer.PaymentUpdatesKafkaConsumer;
import it.ioapp.com.reminder.consumer.ReminderKafkaConsumer;
import it.ioapp.com.reminder.deserializer.AvroMessageDeserializer;
import it.ioapp.com.reminder.deserializer.AvroMessageStatusDeserializer;
import it.ioapp.com.reminder.deserializer.PaymentMessageDeserializer;
import it.ioapp.com.reminder.deserializer.ReminderDeserializer;
import it.ioapp.com.reminder.dto.PaymentMessage;
import it.ioapp.com.reminder.dto.SenderMetadata;
import it.ioapp.com.reminder.exception.AvroDeserializerException;
import it.ioapp.com.reminder.exception.SkipDataException;
import it.ioapp.com.reminder.exception.UnexpectedDataException;
import it.ioapp.com.reminder.model.JsonLoader;
import it.ioapp.com.reminder.model.Reminder;


@Configuration
public class ConfigConsumer extends ConfigKafka{

	@Autowired
	ObjectMapper mapper;

	@Value("${kafka.topic.message}")
	private String urlMessage;
	@Value("${kafka.topic.messagestatus}")
	private String urlMessageStatus;
	@Value("${bootstrap.servers.message}")
	private String serverMessage;
	@Value("${bootstrap.servers.messagestatus}")
	private String serverMessageStatus;
	@Value("${bootstrap.servers.messagesend}")
	protected String serverMessageSend;
	@Value("${kafka.topic.messagesend}")
	protected String urlMessageSend;

	@Bean
	public MessageKafkaConsumer messageEventKafkaConsumer() {
		return new MessageKafkaConsumer();
	}

	@Bean
	public MessageStatusKafkaConsumer messageStatusEventKafkaConsumer() {
		return new MessageStatusKafkaConsumer();
	}

	@Bean
	public PaymentUpdatesKafkaConsumer paymentUpdatesEventKafkaConsumer() {
		return new PaymentUpdatesKafkaConsumer();
	}

	@Bean
	public ReminderKafkaConsumer reminderEventKafkaConsumer() {
		return new ReminderKafkaConsumer();
	}

	@Bean SenderMetadata reminderEventSenderMetadata() {
		return new SenderMetadata();
	}

	@Bean
	public DefaultErrorHandler defaultErrorHandler() {
		return new DefaultErrorHandler(new FixedBackOff(2000, Long.MAX_VALUE));
	}

	@Bean
	public CommonErrorHandler commonErrorHandler() {
		CommonDelegatingErrorHandler commonDelegatingErrorHandler = new CommonDelegatingErrorHandler(
				defaultErrorHandler());
		KafkaDeserializationErrorHandler deserializationErrorHandler = new KafkaDeserializationErrorHandler();
		commonDelegatingErrorHandler.addDelegate(DeserializationException.class, deserializationErrorHandler);
		commonDelegatingErrorHandler.addDelegate(AvroDeserializerException.class, deserializationErrorHandler);
		commonDelegatingErrorHandler.addDelegate(SkipDataException.class, deserializationErrorHandler);
		commonDelegatingErrorHandler.addDelegate(UnexpectedDataException.class, deserializationErrorHandler);
		return commonDelegatingErrorHandler;
	}

	@Bean
	public ConcurrentKafkaListenerContainerFactory<String, Reminder> kafkaListenerContainerFactory() {
		ConcurrentKafkaListenerContainerFactory<String, Reminder> factory = new ConcurrentKafkaListenerContainerFactory<>();
		Map<String, Object> props = createProps(urlMessage, serverMessage);
		props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
		props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
		props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, AvroMessageDeserializer.class.getName());
		props.put(ErrorHandlingDeserializer.KEY_DESERIALIZER_CLASS, StringDeserializer.class);
		DefaultKafkaConsumerFactory<String, Reminder> dkc = new DefaultKafkaConsumerFactory<>(props);
		factory.setConsumerFactory(dkc);
		factory.setCommonErrorHandler(commonErrorHandler());
		return factory;
	}


	@Bean
	public ConcurrentKafkaListenerContainerFactory<String, messageStatus> kafkaListenerContainerFactoryMessStat(@Autowired @Qualifier("messageStatusSchema") JsonLoader mesagesStatusSchema) {
		ConcurrentKafkaListenerContainerFactory<String, messageStatus> factoryStatus = new ConcurrentKafkaListenerContainerFactory<>();
		Map<String, Object> props = createProps(urlMessageStatus, serverMessageStatus);
		props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
		props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
		props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, AvroMessageStatusDeserializer.class.getName());
		props.put(ErrorHandlingDeserializer.KEY_DESERIALIZER_CLASS, StringDeserializer.class);
		DefaultKafkaConsumerFactory<String, messageStatus> dkc = new DefaultKafkaConsumerFactory<>(props);
		factoryStatus.setConsumerFactory(dkc);
		factoryStatus.setCommonErrorHandler(commonErrorHandler());
		return factoryStatus;
	}


	@Bean
	public ConcurrentKafkaListenerContainerFactory<String, PaymentMessage> kafkaListenerContainerFactoryPaymentMessage() {
		ConcurrentKafkaListenerContainerFactory<String, PaymentMessage> factoryStatus = new ConcurrentKafkaListenerContainerFactory<>();
		Map<String, Object> props = createPropsShared();
		props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
		props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
		props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, PaymentMessageDeserializer.class.getName());
		props.put(ErrorHandlingDeserializer.KEY_DESERIALIZER_CLASS, StringDeserializer.class);
		DefaultKafkaConsumerFactory<String, PaymentMessage> dkc = new DefaultKafkaConsumerFactory<>(props, new StringDeserializer(), new PaymentMessageDeserializer(mapper));
		factoryStatus.setConsumerFactory(dkc);
		factoryStatus.setCommonErrorHandler(commonErrorHandler());
		return factoryStatus;
	}


	@Bean
	public ConcurrentKafkaListenerContainerFactory<String, Reminder> kafkaListenerContainerFactoryNotify() {
		ConcurrentKafkaListenerContainerFactory<String, Reminder> factory = new ConcurrentKafkaListenerContainerFactory<>();
		Map<String, Object> props = createProps(urlMessageSend, serverMessageSend);
		props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
		props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
		props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, ReminderDeserializer.class.getName());
		props.put(ErrorHandlingDeserializer.KEY_DESERIALIZER_CLASS, StringDeserializer.class);
		DefaultKafkaConsumerFactory<String, Reminder> dkc = new DefaultKafkaConsumerFactory<>(props, new StringDeserializer(), new ReminderDeserializer(mapper));
		factory.setConsumerFactory(dkc);
		factory.setCommonErrorHandler(commonErrorHandler());
		return factory;
	}

}
