package it.ioapp.com.paymentupdater.config;

import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;

import lombok.extern.slf4j.Slf4j;


@Configuration
@Slf4j
public class ConfigProducer extends BeanConf {

	@Value("${bootstrap.servers.paymentupdates}")
	protected String serverPaymentUpdates;
	@Value("${kafka.topic.paymentupdates}")
	protected String urlPaymentUpdates;

	@Bean
	public KafkaTemplate<String, String> kafkaTemplatePayments() {
		Map<String, Object> props = new HashMap<>();
		try {
			getProps(props, urlPaymentUpdates, serverPaymentUpdates);
			props.put(ProducerConfig.CLIENT_ID_CONFIG, "SharedKafkaConsumer");
			props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
			props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
		} catch (Exception e) {
			log.error("Failed to create producer with exception: {} ",e.getMessage());
			return null;
		}
		return new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(props));
	}
}
