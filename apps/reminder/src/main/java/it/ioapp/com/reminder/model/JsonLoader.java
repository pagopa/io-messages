package it.ioapp.com.reminder.model;

import java.io.IOException;
import java.nio.charset.Charset;
import lombok.Getter;
import org.springframework.core.io.Resource;
import org.springframework.util.StreamUtils;

@Getter
// @NoArgsConstructor
// @AllArgsConstructor
public class JsonLoader {

  private String jsonString;

  public JsonLoader(Resource res) throws IOException {
    jsonString = StreamUtils.copyToString(res.getInputStream(), Charset.defaultCharset());
  }
}
