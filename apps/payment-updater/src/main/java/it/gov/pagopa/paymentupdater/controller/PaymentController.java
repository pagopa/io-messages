package it.gov.pagopa.paymentupdater.controller;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

import com.fasterxml.jackson.core.JsonProcessingException;
import it.gov.pagopa.paymentupdater.dto.ProxyResponse;
import it.gov.pagopa.paymentupdater.model.Payment;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.annotations.Api;
import it.gov.pagopa.paymentupdater.model.ApiPaymentMessage;
import it.gov.pagopa.paymentupdater.service.PaymentService;
import lombok.RequiredArgsConstructor;

@Api(tags = "API  Payment")
@RestController
@Validated
@RequestMapping(value = "api/v1/payment", produces = APPLICATION_JSON_VALUE, consumes = {
  MediaType.APPLICATION_JSON_VALUE, MediaType.ALL_VALUE}, method = RequestMethod.OPTIONS)
@RequiredArgsConstructor
public class PaymentController {

  @Autowired
  PaymentService paymentService;

  @GetMapping(value = "/check/messages/{messageId}")
  public ResponseEntity<ApiPaymentMessage> getMessagePayment(@PathVariable String messageId) throws ExecutionException, JsonProcessingException, InterruptedException {
    Payment payment = paymentService.findById(messageId).orElse(null);
    if (payment == null)
      return new ResponseEntity<>(HttpStatus.NOT_FOUND);

    if (!payment.isPaidFlag()) {
      // FIX: sometimes we miss a payment event so if this payment is not paid we try to call paymentService
      if (paymentService != null) {
        ProxyResponse proxyResponse = paymentService.checkPayment(payment);
        if (proxyResponse != null) {
          payment.setPaidFlag(proxyResponse.isPaid());
          paymentService.save(payment);
        }
      }
    }

    ApiPaymentMessage apiPaymentMessage = ApiPaymentMessage.builder()
      .messageId(payment.getId())
      .dueDate(Optional.ofNullable(payment.getDueDate())
        .map(LocalDateTime::toLocalDate)
        .orElse(null))
      .paid(payment.isPaidFlag())
      .amount(payment.getContent_paymentData_amount())
      .fiscalCode(payment.getFiscalCode())
      .noticeNumber(payment.getContent_paymentData_noticeNumber())
      .build();

    return new ResponseEntity<>(apiPaymentMessage, HttpStatus.OK);
  }

}
