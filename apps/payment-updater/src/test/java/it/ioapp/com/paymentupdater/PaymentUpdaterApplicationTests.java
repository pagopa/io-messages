package it.ioapp.com.paymentupdater;

import it.ioapp.com.paymentupdater.util.PaymentUtil;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(
    classes = Application.class,
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PaymentUpdaterApplicationTests {
  @Test
  void main() {
    Application.main(new String[] {});
    Assertions.assertTrue(true);
  }

  @Test
  void timeZoneCheck() {
    LocalDateTime oldDate = LocalDateTime.now();
    LocalDateTime time =
        PaymentUtil.getCurrentTimeZone(oldDate, ZoneId.of("UTC"), ZoneId.of("Europe/Rome"));
    Assertions.assertNotNull(time);
  }
}
