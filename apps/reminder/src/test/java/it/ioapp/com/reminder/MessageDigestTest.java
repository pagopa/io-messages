package it.ioapp.com.reminder;

import it.ioapp.com.reminder.util.ShaUtils;
import org.junit.Test;
import org.junit.jupiter.api.Assertions;

public class MessageDigestTest {

  @Test
  public void testShard() throws Exception {
    String fiscalCode = "EEEEEE00E00E000B";
    Assertions.assertEquals(ShaUtils.getHexString(fiscalCode).substring(0, 1), "4");
  }
}
