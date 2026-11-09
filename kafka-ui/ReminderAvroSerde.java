package it.ioapp.com.local;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.provectus.kafka.ui.serde.api.DeserializeResult;
import com.provectus.kafka.ui.serde.api.PropertyResolver;
import com.provectus.kafka.ui.serde.api.SchemaDescription;
import com.provectus.kafka.ui.serde.api.Serde;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import org.apache.avro.AvroRuntimeException;
import org.apache.avro.Schema;
import org.apache.avro.generic.GenericDatumReader;
import org.apache.avro.generic.GenericDatumWriter;
import org.apache.avro.generic.GenericRecord;
import org.apache.avro.io.DecoderFactory;
import org.apache.avro.io.EncoderFactory;

public final class ReminderAvroSerde implements Serde {

  private static final ObjectMapper MAPPER = new ObjectMapper();
  private Schema schema;

  @Override
  public void configure(
      PropertyResolver serdeProperties,
      PropertyResolver kafkaClusterProperties,
      PropertyResolver globalProperties) {
    String path =
        serdeProperties
            .getProperty("schemaFile", String.class)
            .orElseThrow(() -> new IllegalArgumentException("schemaFile is required"));
    try {
      schema = new Schema.Parser().parse(new File(path));
    } catch (IOException e) {
      throw new UncheckedIOException("Cannot read reminder Avro schema: " + path, e);
    }
  }

  @Override
  public Optional<String> getDescription() {
    return Optional.of(
        "Reminder JSON to raw Avro, without Confluent framing. "
            + "Enum fields accept plain strings such as ADVANCED and PAYMENT.");
  }

  @Override
  public Optional<SchemaDescription> getSchema(String topic, Target type) {
    return Optional.empty();
  }

  @Override
  public boolean canSerialize(String topic, Target type) {
    return type == Target.VALUE && "reminder-messages".equals(topic);
  }

  @Override
  public boolean canDeserialize(String topic, Target type) {
    return canSerialize(topic, type);
  }

  @Override
  public Serializer serializer(String topic, Target type) {
    requireSupportedTarget(topic, type);
    return input -> {
      if (input == null) {
        return null;
      }
      try {
        JsonNode node = MAPPER.readTree(input);
        if (!(node instanceof ObjectNode record)) {
          throw new IllegalArgumentException("Reminder payload must be a JSON object");
        }
        record
            .fieldNames()
            .forEachRemaining(
                name -> {
                  if (schema.getField(name) == null) {
                    throw new IllegalArgumentException("Unknown reminder field: " + name);
                  }
                });
        for (Schema.Field field : schema.getFields()) {
          JsonNode value = record.get(field.name());
          if (field.schema().getType() == Schema.Type.UNION && value != null && value.isTextual()) {
            for (Schema branch : field.schema().getTypes()) {
              if (branch.getType() == Schema.Type.ENUM) {
                record.set(
                    field.name(), MAPPER.createObjectNode().set(branch.getFullName(), value));
                break;
              }
            }
          }
        }

        GenericRecord datum =
            new GenericDatumReader<GenericRecord>(schema)
                .read(null, DecoderFactory.get().jsonDecoder(schema, record.toString()));
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        var encoder = EncoderFactory.get().binaryEncoder(output, null);
        new GenericDatumWriter<GenericRecord>(schema).write(datum, encoder);
        encoder.flush();
        return output.toByteArray();
      } catch (IOException | AvroRuntimeException e) {
        throw new IllegalArgumentException("Invalid reminder Avro JSON: " + e.getMessage(), e);
      }
    };
  }

  @Override
  public Deserializer deserializer(String topic, Target type) {
    requireSupportedTarget(topic, type);
    return (headers, data) -> {
      if (data == null) {
        return new DeserializeResult(null, DeserializeResult.Type.JSON, Map.of());
      }
      try {
        var decoder = DecoderFactory.get().binaryDecoder(data, null);
        GenericRecord datum = new GenericDatumReader<GenericRecord>(schema).read(null, decoder);
        if (!decoder.isEnd()) {
          throw new IllegalArgumentException("Trailing bytes after reminder Avro record");
        }
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        var encoder = EncoderFactory.get().jsonEncoder(schema, output);
        new GenericDatumWriter<GenericRecord>(schema).write(datum, encoder);
        encoder.flush();
        return new DeserializeResult(
            output.toString(StandardCharsets.UTF_8), DeserializeResult.Type.JSON, Map.of());
      } catch (IOException | AvroRuntimeException e) {
        throw new IllegalArgumentException("Invalid raw reminder Avro: " + e.getMessage(), e);
      }
    };
  }

  private void requireSupportedTarget(String topic, Target type) {
    if (!canSerialize(topic, type)) {
      throw new IllegalArgumentException("Reminder Avro supports only reminder-messages values");
    }
  }
}
