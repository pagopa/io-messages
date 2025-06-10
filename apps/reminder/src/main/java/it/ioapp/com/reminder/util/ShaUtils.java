package it.ioapp.com.reminder.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.apache.commons.codec.binary.Hex;

public class ShaUtils {

  public static String getHexString(String toEncode) throws NoSuchAlgorithmException {
    MessageDigest digest = MessageDigest.getInstance("SHA-256");
    byte[] byteOfTextToHash = toEncode.getBytes(StandardCharsets.UTF_8);
    byte[] hashedByetArray = digest.digest(byteOfTextToHash);
    return Hex.encodeHexString(hashedByetArray);
  }
}
