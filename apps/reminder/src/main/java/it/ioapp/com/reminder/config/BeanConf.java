package it.ioapp.com.reminder.config;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;

public class BeanConf {

  @Value("${bootstrap.servers}")
  protected String bootstrapServersKey;

  @Value("${security.protocol}")
  protected String securityProtocolKey;

  @Value("${sasl.mechanism}")
  protected String saslMechanismKey;

  @Value("${sasl.jaas.conf}")
  protected String saslJaasConfKey;

  @Value("${security.protocol.reminder}")
  protected String securityProtocolKeyRemValue;

  @Value("${sasl.mechanism.reminder}")
  protected String saslMechanismKeyRemValue;

  @Value("${bootstrap.servers.shared}")
  protected String bootstrapServersKeySharedValue;

  @Value("${security.protocol.shared}")
  protected String securityProtocolKeySharedValue;

  @Value("${sasl.mechanism.shared}")
  protected String saslMechanismKeySharedValue;

  @Value("${sasl.jaas.conf.shared}")
  protected String saslJaasConfKeySharedValue;

  public void getPropsShared(Map<String, Object> props) {
    props.put(bootstrapServersKey, bootstrapServersKeySharedValue);
    props.put(securityProtocolKey, securityProtocolKeySharedValue);
    props.put(saslMechanismKey, saslMechanismKeySharedValue);
    props.put(saslJaasConfKey, saslJaasConfKeySharedValue);
  }

  public void getPropsReminder(Map<String, Object> props, String url, String server) {
    props.put(bootstrapServersKey, server);
    props.put(securityProtocolKey, securityProtocolKeyRemValue);
    props.put(saslMechanismKey, saslMechanismKeyRemValue);
    props.put(saslJaasConfKey, url);
  }
}
