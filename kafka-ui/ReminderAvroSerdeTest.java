package it.ioapp.com.local;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.provectus.kafka.ui.serde.api.Serde.Target;
import com.provectus.kafka.ui.serdes.PropertyResolverImpl;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;
import org.apache.avro.Schema;
import org.apache.avro.generic.GenericDatumReader;
import org.apache.avro.generic.GenericRecord;
import org.apache.avro.io.DecoderFactory;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

public final class ReminderAvroSerdeTest {

  public static void main(String[] args) throws Exception {
    var environment = new StandardEnvironment();
    environment
        .getPropertySources()
        .addFirst(new MapPropertySource("test", Map.of("schemaFile", args[0])));
    var resolver = new PropertyResolverImpl(environment);
    var serde = new ReminderAvroSerde();
    serde.configure(resolver, resolver, resolver);
    var serializer = serde.serializer("reminder-messages", Target.VALUE);
    var deserializer = serde.deserializer("reminder-messages", Target.VALUE);
    var mapper = new ObjectMapper();
    String input =
        """
        {
          "fiscalCode": "AAAAAA00A00A000A",
          "id": "local-serde-test",
          "senderServiceId": "01JXJ24SKJ93413KX6RRSNMCH1",
          "senderUserId": "local",
          "timeToLiveSeconds": 86400,
          "createdAt": 1794216339278,
          "isPending": false,
          "content_subject": "Local payment test",
          "feature_level_type": "ADVANCED",
          "content_type": "PAYMENT",
          "content_paymentData_amount": 11400,
          "content_paymentData_noticeNumber": "000000000000000001",
          "content_paymentData_invalidAfterDueDate": true,
          "content_paymentData_payeeFiscalCode": "99999999999",
          "dueDate": 1794830400000
        }
        """;

    byte[] encoded = serializer.serialize(input);
    Schema schema = new Schema.Parser().parse(new File(args[0]));
    var decoder = DecoderFactory.get().binaryDecoder(encoded, null);
    GenericRecord record = new GenericDatumReader<GenericRecord>(schema).read(null, decoder);
    assert decoder.isEnd() : "Serializer must write exactly one raw Avro datum";
    assert record.get("id").toString().equals("local-serde-test");
    assert record.get("content_type").toString().equals("PAYMENT");
    assert record.get("feature_level_type").toString().equals("ADVANCED");
    assert record.get("dueDate").equals(1794830400000L);

    String decoded = deserializer.deserialize(null, encoded).getResult();
    assert mapper
        .readTree(decoded)
        .path("content_type")
        .path("dto.MessageContentType")
        .asText()
        .equals("PAYMENT");
    assert Arrays.equals(encoded, serializer.serialize(decoded))
        : "Canonical Avro JSON must also be accepted";

    ObjectNode nullable = (ObjectNode) mapper.readTree(input);
    nullable.putNull("feature_level_type");
    nullable.putNull("content_type");
    GenericRecord nullRecord =
        new GenericDatumReader<GenericRecord>(schema)
            .read(
                null,
                DecoderFactory.get()
                    .binaryDecoder(serializer.serialize(nullable.toString()), null));
    assert nullRecord.get("content_type") == null;

    ObjectNode invalidEnum = (ObjectNode) mapper.readTree(input);
    invalidEnum.put("content_type", "INVALID");
    expectInvalid(() -> serializer.serialize(invalidEnum.toString()));
    ObjectNode invalidNumber = (ObjectNode) mapper.readTree(input);
    invalidNumber.put("dueDate", "not-a-timestamp");
    expectInvalid(() -> serializer.serialize(invalidNumber.toString()));
    ObjectNode missingField = (ObjectNode) mapper.readTree(input);
    missingField.remove("id");
    expectInvalid(() -> serializer.serialize(missingField.toString()));
    ObjectNode unknownField = (ObjectNode) mapper.readTree(input);
    unknownField.put("due_date", 123);
    expectInvalid(() -> serializer.serialize(unknownField.toString()));
    expectInvalid(() -> serializer.serialize("{"));
    expectInvalid(() -> serializer.serialize("[]"));
    expectInvalid(() -> deserializer.deserialize(null, input.getBytes(StandardCharsets.UTF_8)));
    byte[] trailingBytes = Arrays.copyOf(encoded, encoded.length + 1);
    expectInvalid(() -> deserializer.deserialize(null, trailingBytes));

    assert !serde.canSerialize("payment-updates", Target.VALUE);
    assert !serde.canDeserialize("payment-updates", Target.VALUE);
    assert !serde.canSerialize("reminder-messages", Target.KEY);
    expectInvalid(() -> serde.serializer("payment-updates", Target.VALUE));
    assert serializer.serialize(null) == null;
    assert deserializer.deserialize(null, null).getResult() == null;
    System.out.println("Reminder Avro serde tests passed");
  }

  private static void expectInvalid(Runnable action) {
    try {
      action.run();
    } catch (IllegalArgumentException expected) {
      return;
    }
    throw new AssertionError("Invalid input was accepted");
  }
}
