package it.ioapp.com.reminder.config;

import it.ioapp.com.reminder.exception.AvroDeserializerException;
import it.ioapp.com.reminder.exception.SkipDataException;
import it.ioapp.com.reminder.exception.UnexpectedDataException;
import it.ioapp.com.reminder.util.ReminderUtil;
import it.ioapp.com.reminder.util.TelemetryCustomEvent;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.TopicPartition;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.listener.ListenerExecutionFailedException;
import org.springframework.kafka.listener.MessageListenerContainer;
import org.springframework.kafka.support.serializer.DeserializationException;

@Slf4j
final class KafkaDeserializationErrorHandler extends DefaultErrorHandler {

  @Override
  public void handleRemaining(
      Exception thrownException,
      List<ConsumerRecord<?, ?>> records,
      Consumer<?, ?> consumer,
      MessageListenerContainer container) {
    Throwable toCheck = thrownException;
    if (thrownException instanceof ListenerExecutionFailedException) {
      toCheck = thrownException.getCause();
    }
    doSeeks(records, consumer);
    if (!records.isEmpty()) {
      ConsumerRecord<?, ?> record = records.get(0);
      String topic = record.topic();
      long offset = record.offset();
      int partition = record.partition();
      String message = "";
      if (toCheck.getClass().equals(DeserializationException.class)) {
        DeserializationException exception = (DeserializationException) toCheck;
        message = new String(exception.getData());
        log.debug(
            "DeserializationException|Skipping message with topic {} and offset {} "
                + "- malformed message: {} , exception: {}",
            topic,
            offset,
            message,
            exception.getLocalizedMessage());
        handleErrorMessage(exception.getData());
        return;
      }
      if (toCheck.getClass().equals(AvroDeserializerException.class)) {
        AvroDeserializerException exception = (AvroDeserializerException) toCheck;
        message = new String(exception.getData());
        log.debug(
            "AvroDeserializerException|Skipping message with topic {} and offset {} "
                + "- malformed message: {} , exception: {}",
            topic,
            offset,
            message,
            exception.getLocalizedMessage());
        handleErrorMessage(exception.getData());
        return;
      }
      if (toCheck.getClass().equals(UnexpectedDataException.class)) {
        UnexpectedDataException exception = (UnexpectedDataException) toCheck;
        log.debug(
            "UnexpectedDataException|Skipping message with topic {} and offset {} "
                + "- unexpected message: {} , exception: {}",
            topic,
            offset,
            exception.getSkippedData(),
            thrownException.getMessage());
        handleErrorMessage(exception.getSkippedData().toString().getBytes());
        return;
      }
      if (toCheck.getClass().equals(SkipDataException.class)) {
        log.debug(
            "SkipDataException|Skipping message with topic {} and offset {} " + "- exception: {}",
            topic,
            offset,
            toCheck.getMessage());
        return;
      }

      log.debug(
          "Skipping message with topic {} - offset {} - partition {} - record value {} exception {}",
          topic,
          offset,
          partition,
          record.value(),
          toCheck);

    } else {
      log.debug("Consumer exception - cause: {}", thrownException.getMessage());
    }
  }

  private void handleErrorMessage(byte[] bytes) {
    try {
      String message = new String(bytes, StandardCharsets.UTF_8);
      TelemetryCustomEvent.writeTelemetry(
          "ErrorDeserializingMessage", new HashMap<>(), ReminderUtil.getErrorMap(message));

    } catch (Exception e1) {
      log.error(e1.getMessage());
    }
  }

  private void doSeeks(List<ConsumerRecord<?, ?>> records, Consumer<?, ?> consumer) {
    Map<TopicPartition, Long> partitions = new LinkedHashMap<>();
    AtomicBoolean first = new AtomicBoolean(true);
    records.forEach(
        record -> {
          log.debug("Seeking key=" + record.key());
          if (first.get()) {
            partitions.put(
                new TopicPartition(record.topic(), record.partition()), record.offset() + 1);
          } else {
            partitions.computeIfAbsent(
                new TopicPartition(record.topic(), record.partition()), offset -> record.offset());
          }
          first.set(false);
        });
    partitions.forEach(consumer::seek);
  }
}
