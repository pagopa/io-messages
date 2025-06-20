package it.ioapp.com.paymentupdater.config;

import java.util.Map;
import org.apache.kafka.clients.CommonClientConfigs;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.config.SaslConfigs;
import org.springframework.beans.factory.annotation.Value;

public class BeanConf {

  @Value("${security.protocol.payment}")
  protected String securityProtocolKeyPayValue;

  @Value("${sasl.mechanism.payment}")
  protected String saslMechanismKeyPayValue;

  public void getProps(Map<String, Object> props, String url, String server) {
    props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, server);
    props.put(CommonClientConfigs.SECURITY_PROTOCOL_CONFIG, securityProtocolKeyPayValue);
    props.put(SaslConfigs.SASL_MECHANISM, saslMechanismKeyPayValue);
    props.put(SaslConfigs.SASL_JAAS_CONFIG, url);
  }
}
