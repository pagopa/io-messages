package it.ioapp.com.reminder.config;

import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;

import it.ioapp.com.reminder.util.Constants;
import lombok.extern.slf4j.Slf4j;

@Configuration
@Slf4j
public class ConfigProducer extends BeanConf{

	@Value("${bootstrap.servers.messagesend}")
	protected String serverMessageSend;
	@Value("${kafka.topic.messagesend}")
	protected String urlMessageSend;

	@Bean
	public KafkaTemplate<String, String> kafkaTemplatePayments() {
		Map<String, Object> props = new HashMap<>();
		try {
			getPropsReminder(props, urlMessageSend, serverMessageSend);
			props.put(ProducerConfig.CLIENT_ID_CONFIG, Constants.CLIENT_ID_CONFIG_PRODUCER);
			props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
			props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
		} catch (Exception e) {
			log.error("Failed to create producer with exception: {} ",e.getMessage());
		}
		return new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(props));
	}

}
