package it.ioapp.com.reminder.config;

import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;

import lombok.extern.slf4j.Slf4j;


@EnableKafka
@Configuration
@Slf4j
public class ConfigKafka extends BeanConf{

	protected Map<String, Object> createProps(String url, String server) {
		Map<String, Object> props = new HashMap<>();
		try {
			getPropsReminder(props, url, server);
			props.put(ConsumerConfig.GROUP_ID_CONFIG, "ReminderKafkaConsumer");
			props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
			props.put("value.deserializer.specific.avro.reader", "true") ;
			props.put("spring.kafka.consumer.properties.specific.avro.reader", "true") ;
		} catch (Exception e) {
			log.error("Failed to create consumer with exception: " + e.getMessage());
		}
		return props;
	}

	protected Map<String, Object> createPropsShared() {
		Map<String, Object> props = new HashMap<>();
		try {
			getPropsShared(props);
			props.put(ConsumerConfig.GROUP_ID_CONFIG, "SharedKafkaConsumer");
			props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
			props.put("value.deserializer.specific.avro.reader", "true") ;
			props.put("spring.kafka.consumer.properties.specific.avro.reader", "true") ;
		} catch (Exception e) {
			log.error("Failed to create consumer with exception: " + e.getMessage());
		}
		return props;
	}
}
