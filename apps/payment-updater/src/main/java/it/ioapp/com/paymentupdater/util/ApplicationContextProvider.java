package it.ioapp.com.paymentupdater.util;

import lombok.Setter;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

@Component
public class ApplicationContextProvider implements ApplicationContextAware {
  @Setter private static ApplicationContext context;

  public static <T extends Object> T getBean(Class<T> beanClass) {
    return context.getBean(beanClass);
  }

  public static Object getBean(String beanName) {
    return context.getBean(beanName);
  }

  public static ApplicationContext getApplicationContext() {
    return context;
  }

  @Override
  public void setApplicationContext(ApplicationContext ctx) {
    setContext(ctx);
  }
}
