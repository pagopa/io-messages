package it.ioapp.com.paymentupdater.consumer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.core.IntervalFunction;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.event.RetryOnErrorEvent;
import it.ioapp.com.paymentupdater.dto.PaymentMessage;
import it.ioapp.com.paymentupdater.dto.payments.PaymentRoot;
import it.ioapp.com.paymentupdater.model.Payment;
import it.ioapp.com.paymentupdater.model.PaymentRetry;
import it.ioapp.com.paymentupdater.producer.PaymentProducer;
import it.ioapp.com.paymentupdater.service.PaymentRetryService;
import it.ioapp.com.paymentupdater.service.PaymentService;
import it.ioapp.com.paymentupdater.util.TelemetryCustomEvent;
import java.lang.reflect.UndeclaredThrowableException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CountDownLatch;
import java.util.function.Function;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;

@Slf4j
public class PaymentKafkaConsumer {

  @Autowired PaymentService paymentService;
  @Autowired PaymentRetryService paymentRetryService;

  @Autowired
  @Qualifier("kafkaTemplatePayments")
  private KafkaTemplate<String, String> kafkaTemplatePayments;

  @Autowired PaymentProducer producer;
  @Autowired ObjectMapper mapper;

  @Value("${kafka.paymentupdates}")
  private String producerTopic;

  @Value("${interval.function}")
  private int intervalFunction;

  @Value("${attempts.max}")
  private int attemptsMax;

  private CountDownLatch latch = new CountDownLatch(1);

  @KafkaListener(
      topics = "${kafka.payment}",
      groupId = "consumer-Payment",
      containerFactory = "kafkaListenerContainerFactoryPaymentRoot",
      autoStartup = "${payment.auto.start}")
  public void paymentKafkaListener(PaymentRoot root) throws JsonProcessingException {
    if (Objects.nonNull(root)
        && Objects.nonNull(root.getDebtorPosition())
        && Objects.nonNull(root.getDebtorPosition().getNoticeNumber())
        && Objects.nonNull(root.getCreditor())
        && Objects.nonNull(root.getCreditor().getIdPA())) {

      List<Payment> payments =
          paymentService.getPaymentsByRptid(
              root.getCreditor().getIdPA().concat(root.getDebtorPosition().getNoticeNumber()));
      for (Payment payment : payments) {
        PaymentMessage message = new PaymentMessage();
        message.setMessageId(payment.getId());
        message.setSource("payments");
        message.setFiscalCode(payment.getFiscalCode());
        message.setNoticeNumber(payment.getContent_paymentData_noticeNumber());
        message.setPayeeFiscalCode(payment.getContent_paymentData_payeeFiscalCode());
        message.setPaid(true);
        if (root.getPaymentInfo() != null
            && StringUtils.isNotEmpty(root.getPaymentInfo().getPaymentDateTime())) {
          message.setPaymentDateTime(
              LocalDateTime.parse(root.getPaymentInfo().getPaymentDateTime()));
          payment.setPaidDate(LocalDateTime.parse(root.getPaymentInfo().getPaymentDateTime()));
        }
        payment.setPaidFlag(true);
        paymentService.save(payment);
        sendPaymentUpdateWithRetry(mapper.writeValueAsString(message));
      }

      if (payments.isEmpty()) {
        log.info("Not found payment in payment data");
      }
    }
    this.latch.countDown();
  }

  private void sendPaymentUpdateWithRetry(String message) {
    IntervalFunction intervalFn = IntervalFunction.of(intervalFunction);

    RetryConfig retryConfig =
        RetryConfig.custom().maxAttempts(attemptsMax).intervalFunction(intervalFn).build();
    Retry retry = Retry.of("sendNotificationWithRetry", retryConfig);
    Function<Object, String> sendPaymentUpdateFn =
        Retry.decorateFunction(
            retry,
            notObj -> {
              try {
                return producer.sendPaymentUpdate(message, kafkaTemplatePayments, producerTopic);
              } catch (Exception e) {
                throw new UndeclaredThrowableException(e);
              }
            });
    Retry.EventPublisher publisher = retry.getEventPublisher();
    publisher.onError(
        event -> {
          if (event.getNumberOfRetryAttempts() == attemptsMax) {
            // when max attempts are reached
            PaymentRetry retryMessage = messageToRetry(message);
            List<PaymentRetry> paymentList =
                paymentRetryService.getPaymentRetryByNoticeNumberAndFiscalCode(
                    retryMessage.getNoticeNumber(), retryMessage.getPayeeFiscalCode());
            if (Objects.nonNull(retryMessage) && paymentList.isEmpty()) {
              retryMessage.setInsertionDate(LocalDateTime.now());
              paymentRetryService.save(retryMessage);
              TelemetryCustomEvent.writeTelemetry(
                  "ErrorSendPaymentUpdate", new HashMap<>(), getErrorMap(retryMessage, event));
            }
          }
        });
    sendPaymentUpdateFn.apply(message);
  }

  private PaymentRetry messageToRetry(String message) {
    try {
      return mapper.readValue(message, PaymentRetry.class);
    } catch (JsonProcessingException e) {
      log.error(e.getMessage());
    }
    return null;
  }

  private Map<String, String> getErrorMap(PaymentRetry message, RetryOnErrorEvent event) {
    Map<String, String> properties = new HashMap<>();
    properties.put(message.getNoticeNumber(), " Call failed after maximum number of attempts");
    properties.put("time", event.getCreationTime().toString());
    if (Objects.nonNull(event.getLastThrowable().getMessage()))
      properties.put("message", event.getLastThrowable().getMessage());
    if (Objects.nonNull(event.getLastThrowable().getCause()))
      properties.put("cause", event.getLastThrowable().getCause().toString());
    return properties;
  }

  public CountDownLatch getLatch() {
    return latch;
  }
}
