package it.ioapp.com.paymentupdater.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.ioapp.com.paymentupdater.dto.PaymentMessage;
import it.ioapp.com.paymentupdater.dto.ProxyResponse;
import it.ioapp.com.paymentupdater.model.Payment;
import it.ioapp.com.paymentupdater.producer.PaymentProducer;
import it.ioapp.com.paymentupdater.repository.PaymentRepository;
import it.ioapp.com.paymentupdater.restclient.proxy.api.DefaultApi;
import it.ioapp.com.paymentupdater.restclient.proxy.model.PaymentRequestsGetResponse;
import it.ioapp.com.paymentupdater.restclient.proxy.model.PaymentStatusFaultPaymentProblemJson;
import it.ioapp.com.paymentupdater.util.PaymentUtil;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutionException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
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

  @Value("${proxy_endpoint_subscription_key}")
  private String proxyEndpointKey;

  @Autowired PaymentProducer producer;
  @Autowired DefaultApi defaultApi;

  @Autowired
  @Qualifier("kafkaTemplatePayments")
  private KafkaTemplate<String, String> kafkaTemplatePayments;

  @Override
  public void save(Payment reminder) {
    paymentRepository.save(reminder);
    log.info("Saved payment id: {}", reminder.getId());
  }

  @Override
  public ProxyResponse checkPayment(Payment payment)
      throws JsonProcessingException, InterruptedException, ExecutionException {
    LocalDate paymentDueDate =
        payment.getDueDate() != null ? payment.getDueDate().toLocalDate() : null;
    ProxyResponse proxyResp = new ProxyResponse();
    try {
      if (enableRestKey) {
        defaultApi.getApiClient().addDefaultHeader("Ocp-Apim-Subscription-Key", proxyEndpointKey);
      }
      PaymentRequestsGetResponse resp = defaultApi.getPaymentInfo(payment.getRptId());
      LocalDate dueDate = PaymentUtil.getLocalDateFromString(resp.getDueDate());
      proxyResp.setDueDate(dueDate);
      return proxyResp;
    } catch (HttpStatusCodeException errorException) {
      PaymentStatusFaultPaymentProblemJson res =
          mapper.readValue(
              errorException.getResponseBodyAsString(), PaymentStatusFaultPaymentProblemJson.class);
      if (res.getDetailV2() != null) {
        if (Arrays.asList(HttpStatus.CONFLICT, HttpStatus.INTERNAL_SERVER_ERROR)
                .contains(errorException.getStatusCode())
            && Arrays.asList(
                    "PAA_PAGAMENTO_DUPLICATO", "PPT_RPT_DUPLICATA", "PPT_PAGAMENTO_DUPLICATO")
                .contains(res.getDetailV2())) {
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
          proxyResp.setPaid(true);
          proxyResp.setDueDate(paymentDueDate);
          return proxyResp;
        }
        proxyResp.setPaid(false);
        proxyResp.setDueDate(paymentDueDate);
        return proxyResp;
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
