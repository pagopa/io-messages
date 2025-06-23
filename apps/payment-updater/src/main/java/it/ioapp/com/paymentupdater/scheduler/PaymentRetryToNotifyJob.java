package it.ioapp.com.paymentupdater.scheduler;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.ioapp.com.paymentupdater.model.PaymentRetry;
import it.ioapp.com.paymentupdater.producer.PaymentProducer;
import it.ioapp.com.paymentupdater.service.PaymentRetryService;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ExecutionException;
import javax.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class PaymentRetryToNotifyJob implements Job {

  private static final String JOB_LOG_NAME = "PaymentRetry to NOTIFY Job ";

  private final PaymentRetryService paymentRetryService;

  @Autowired
  @Qualifier("kafkaTemplatePayments")
  private KafkaTemplate<String, String> kafkaTemplatePayments;

  @Autowired PaymentProducer producer;

  @Autowired ObjectMapper mapper;

  @Value("${kafka.paymentupdates}")
  private String producerTopic;

  @Value("${scheduler.retrytonotify.size}")
  private int size;

  @Autowired
  public PaymentRetryToNotifyJob(PaymentRetryService paymentRetryService) {
    this.paymentRetryService = paymentRetryService;
  }

  @Transactional(Transactional.TxType.NOT_SUPPORTED)
  public void execute(JobExecutionContext context) {
    log.info(JOB_LOG_NAME + "started");
    Instant start = Instant.now();
    List<PaymentRetry> retryList = paymentRetryService.findTopElements(size).getContent();
    retryList.forEach(
        retry -> {
          try {
            producer.sendPaymentUpdate(
                mapper.writeValueAsString(retry), kafkaTemplatePayments, producerTopic);
            log.info("Delete paymentRetry with noticeNumber: {}", retry.getNoticeNumber());
            paymentRetryService.delete(retry);
          } catch (InterruptedException e) {
            log.error(e.getMessage());
            Thread.currentThread().interrupt();
          } catch (JsonProcessingException | ExecutionException e) {
            log.error(e.getMessage());
          }
        });
    Instant end = Instant.now();
    log.info(JOB_LOG_NAME + "ended in " + Duration.between(start, end).getSeconds() + " seconds");
  }
}
