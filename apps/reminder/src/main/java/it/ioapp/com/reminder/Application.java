package it.ioapp.com.reminder;

import com.microsoft.applicationinsights.attach.ApplicationInsights;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {

  public static void main(String[] args) {
    ApplicationInsights.attach();
    SpringApplication.run(Application.class, args);
  }
}
