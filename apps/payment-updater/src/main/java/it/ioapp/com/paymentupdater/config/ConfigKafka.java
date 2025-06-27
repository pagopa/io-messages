package it.ioapp.com.paymentupdater.config;

import java.util.HashMap;
import java.util.Map;
import lombok.extern.log4j.Log4j2;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;

@EnableKafka
@Configuration
@Log4j2
public class ConfigKafka extends BeanConf {

  private static final String ID_CONFIG = "PaymentUpdaterConsumer";

  protected Map<String, Object> createProps(String url, String server) {
    Map<String, Object> props = new HashMap<>();
    try {
      getProps(props, url, server);
      props.put(ConsumerConfig.GROUP_ID_CONFIG, ID_CONFIG);
      props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
      props.put("value.deserializer.specific.avro.reader", "true");
      props.put("spring.kafka.consumer.properties.specific.avro.reader", "true");
    } catch (Exception e) {
      log.error(e.getMessage());
    }
    return props;
  }
}
