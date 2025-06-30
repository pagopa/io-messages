package it.ioapp.com.paymentupdater.consumer;

import static it.ioapp.com.paymentupdater.util.PaymentUtil.checkNullInMessage;

import com.fasterxml.jackson.core.JsonProcessingException;
import dto.MessageContentType;
import it.ioapp.com.paymentupdater.dto.PaymentInfoResponse;
import it.ioapp.com.paymentupdater.model.Payment;
import it.ioapp.com.paymentupdater.service.PaymentService;
import it.ioapp.com.paymentupdater.util.PaymentUtil;
import java.util.Date;
import java.util.Objects;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;

@Slf4j
public class MessageKafkaConsumer {

  @Autowired PaymentService paymentService;

  private CountDownLatch latch = new CountDownLatch(1);
  private String payload = null;

  @KafkaListener(
      topics = "${kafka.message}",
      groupId = "consumer-message",
      containerFactory = "kafkaListenerContainerFactory",
      autoStartup = "${message.auto.start}")
  public void messageKafkaListener(Payment paymentMessage)
      throws JsonProcessingException, InterruptedException, ExecutionException {
    log.debug(
        "Processing messageId="
            + paymentMessage.getId()
            + " time="
            + new Date().toString()
            + " paymentMessageContentType= "
            + paymentMessage.getContent_type());
    if (Objects.nonNull(paymentMessage.getContent_type())
        && paymentMessage.getContent_type().equals(MessageContentType.PAYMENT)) {
      log.debug("Received message with id: {} ", paymentMessage.getId());
      checkNullInMessage(paymentMessage);
      payload = paymentMessage.toString();

      if (paymentService.countById(paymentMessage.getId()) == 0) {

        String rptId =
            paymentMessage
                .getContent_paymentData_payeeFiscalCode()
                .concat(paymentMessage.getContent_paymentData_noticeNumber());
        paymentMessage.setRptId(rptId);
        PaymentInfoResponse paymentInfo = paymentService.checkPayment(paymentMessage);
        if (paymentInfo.isPaid()) {
          paymentMessage.setPaidFlag(true);
        } else {
          PaymentUtil.checkDueDateForPayment(paymentInfo.getDueDate(), paymentMessage);
        }
        paymentService.save(paymentMessage);
      }
    }

    this.latch.countDown();
  }

  public CountDownLatch getLatch() {
    return latch;
  }

  public String getPayload() {
    return payload;
  }
}
