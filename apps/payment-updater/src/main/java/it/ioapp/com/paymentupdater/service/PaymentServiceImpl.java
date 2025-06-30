package it.ioapp.com.paymentupdater.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.ioapp.com.paymentupdater.dto.PaymentInfoResponse;
import it.ioapp.com.paymentupdater.dto.PaymentMessage;
import it.ioapp.com.paymentupdater.model.Payment;
import it.ioapp.com.paymentupdater.producer.PaymentProducer;
import it.ioapp.com.paymentupdater.repository.PaymentRepository;
import it.ioapp.com.paymentupdater.restclient.pagopaecommerce.api.PaymentRequestsApi;
import it.ioapp.com.paymentupdater.restclient.pagopaecommerce.model.InlineResponse409;
import it.ioapp.com.paymentupdater.restclient.pagopaecommerce.model.PaymentDuplicatedStatusFaultPaymentProblemJson;
import it.ioapp.com.paymentupdater.restclient.pagopaecommerce.model.PaymentRequestsGetResponse;
import it.ioapp.com.paymentupdater.util.PaymentUtil;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutionException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

@Service
@Transactional
@Slf4j
public class PaymentServiceImpl implements PaymentService {

  @Autowired PaymentRepository paymentRepository;
  @Autowired ObjectMapper mapper;
  @Autowired RestTemplate restTemplate;

  @Value("${kafka.paymentupdates}")
  private String topic;

  @Value("${enable_rest_key}")
  private boolean enableRestKey;

  @Value("${pagopa_ecommerce.url}")
  private String ecommerceUrl;

  @Value("${pagopa_ecommerce.key}")
  private String ecommerceAuthKey;

  @Autowired PaymentProducer producer;
  @Autowired PaymentRequestsApi paymentApi;

  @Autowired
  @Qualifier("kafkaTemplatePayments")
  private KafkaTemplate<String, String> kafkaTemplatePayments;

  @Override
  public void save(Payment reminder) {
    paymentRepository.save(reminder);
    log.info("Saved payment id: {}", reminder.getId());
  }

  @Override
  public PaymentInfoResponse checkPayment(Payment payment)
      throws JsonProcessingException, InterruptedException, ExecutionException {
    LocalDate paymentDueDate =
        payment.getDueDate() != null ? payment.getDueDate().toLocalDate() : null;
    PaymentInfoResponse paymentInfo = new PaymentInfoResponse();
    try {
      paymentApi.getApiClient().addDefaultHeader("Ocp-Apim-Subscription-Key", ecommerceAuthKey);
      paymentApi.getApiClient().setBasePath(ecommerceUrl);

      PaymentRequestsGetResponse resp = paymentApi.getPaymentRequestInfo(payment.getRptId());
      LocalDate dueDate = PaymentUtil.getLocalDateFromString(resp.getDueDate());
      paymentInfo.setPaid(false);
      paymentInfo.setDueDate(dueDate);
      return paymentInfo;
    } catch (HttpStatusCodeException errorException) {
      String rawResponse = errorException.getResponseBodyAsString();
      log.error("Received error from pagoPa Ecommerce api: {}", rawResponse);
      if (errorException.getStatusCode().value() == 409) {
        InlineResponse409 errorResponse = mapper.readValue(rawResponse, InlineResponse409.class);

        if (errorResponse instanceof PaymentDuplicatedStatusFaultPaymentProblemJson) {
          // the payment message is already paid
          List<Payment> payments = paymentRepository.getPaymentByRptId(payment.getRptId());
          payments.add(payment);
          for (Payment pay : payments) {
            pay.setPaidFlag(true);
            paymentRepository.save(pay);

            PaymentMessage message = new PaymentMessage();
            message.setMessageId(pay.getId());
            message.setFiscalCode(pay.getFiscalCode());
            message.setNoticeNumber(payment.getContent_paymentData_noticeNumber());
            message.setPayeeFiscalCode(payment.getContent_paymentData_payeeFiscalCode());
            message.setSource("payments");
            producer.sendPaymentUpdate(
                mapper.writeValueAsString(message), kafkaTemplatePayments, topic);
          }
          paymentInfo.setPaid(true);
          paymentInfo.setDueDate(paymentDueDate);
          return paymentInfo;
        }
        paymentInfo.setPaid(false);
        paymentInfo.setDueDate(paymentDueDate);
        return paymentInfo;
      } else {
        throw errorException;
      }
    }
  }

  @Override
  public Optional<Payment> findById(String messageId) {
    return paymentRepository.findById(messageId);
  }

  @Override
  public List<Payment> getPaymentsByRptid(String rptid) {
    List<Payment> payments = paymentRepository.getPaymentByRptId(rptid);
    return payments == null ? new ArrayList<>() : payments;
  }

  @Override
  public int countById(String id) {
    return paymentRepository.countById(id);
  }
}
