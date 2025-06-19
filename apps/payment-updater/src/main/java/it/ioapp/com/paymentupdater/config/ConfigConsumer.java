package it.ioapp.com.paymentupdater.config;

import java.util.Map;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.listener.CommonDelegatingErrorHandler;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.DeserializationException;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.util.backoff.FixedBackOff;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.ioapp.com.paymentupdater.consumer.MessageKafkaConsumer;
import it.ioapp.com.paymentupdater.consumer.PaymentKafkaConsumer;
import it.ioapp.com.paymentupdater.deserialize.AvroMessageDeserializer;
import it.ioapp.com.paymentupdater.deserialize.PaymentRootDeserializer;
import it.ioapp.com.paymentupdater.dto.payments.PaymentRoot;
import it.ioapp.com.paymentupdater.exception.AvroDeserializerException;
import it.ioapp.com.paymentupdater.exception.SkipDataException;
import it.ioapp.com.paymentupdater.exception.UnexpectedDataException;
import it.ioapp.com.paymentupdater.model.Payment;

@EnableKafka
@Configuration
public class ConfigConsumer extends ConfigKafka {

	@Value("${bootstrap.servers.message}")
	protected String serverMessage;
	@Value("${kafka.topic.message}")
	protected String urlMessage;
	@Value("${bootstrap.servers.payment}")
	protected String serverPayment;
	@Value("${kafka.topic.payment}")
	protected String urlPayment;

	@Autowired
	ObjectMapper mapper;

	@Bean
	public MessageKafkaConsumer messageEventKafkaConsumer() {
		return new MessageKafkaConsumer();
	}

	@Bean
	public PaymentKafkaConsumer paymentEventKafkaConsumer() {
		return new PaymentKafkaConsumer();
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
	public ConcurrentKafkaListenerContainerFactory<String, Payment> kafkaListenerContainerFactory() {
		ConcurrentKafkaListenerContainerFactory<String, Payment> factory = new ConcurrentKafkaListenerContainerFactory<>();
		Map<String, Object> props = createProps(urlMessage, serverMessage);
		props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
		props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
		props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, AvroMessageDeserializer.class.getName());
		props.put(ErrorHandlingDeserializer.KEY_DESERIALIZER_CLASS, StringDeserializer.class);
		DefaultKafkaConsumerFactory<String, Payment> dkc = new DefaultKafkaConsumerFactory<>(props);
		factory.setConsumerFactory(dkc);
		factory.setCommonErrorHandler(commonErrorHandler());
		return factory;
	}

	@Bean
	public ConcurrentKafkaListenerContainerFactory<String, PaymentRoot> kafkaListenerContainerFactoryPaymentRoot() {
		ConcurrentKafkaListenerContainerFactory<String, PaymentRoot> factoryStatus = new ConcurrentKafkaListenerContainerFactory<>();
		Map<String, Object> props = createProps(urlPayment, serverPayment);
		props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
		props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
		props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, PaymentRootDeserializer.class.getName());
		props.put(ErrorHandlingDeserializer.KEY_DESERIALIZER_CLASS, StringDeserializer.class);
		DefaultKafkaConsumerFactory<String, PaymentRoot> dkc = new DefaultKafkaConsumerFactory<>(props,
				new StringDeserializer(), new PaymentRootDeserializer(mapper));
		factoryStatus.setConsumerFactory(dkc);
		factoryStatus.setCommonErrorHandler(commonErrorHandler());
		return factoryStatus;
	}

}
