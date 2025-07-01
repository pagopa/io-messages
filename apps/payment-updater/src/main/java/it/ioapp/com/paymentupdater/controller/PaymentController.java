package it.ioapp.com.paymentupdater.controller;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import io.swagger.annotations.Api;
import it.ioapp.com.paymentupdater.dto.PaymentInfoResponse;
import it.ioapp.com.paymentupdater.model.ApiPaymentMessage;
import it.ioapp.com.paymentupdater.model.Payment;
import it.ioapp.com.paymentupdater.service.PaymentService;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.ExecutionException;
import lombok.RequiredArgsConstructor;
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

@Api(tags = "API  Payment")
@RestController
@Validated
@RequestMapping(
    value = "api/v1/payment",
    produces = APPLICATION_JSON_VALUE,
    consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.ALL_VALUE},
    method = RequestMethod.OPTIONS)
@RequiredArgsConstructor
public class PaymentController {

  @Autowired PaymentService paymentService;

  @GetMapping(value = "/check/messages/{messageId}")
  public ResponseEntity<ApiPaymentMessage> getMessagePayment(@PathVariable String messageId)
      throws ExecutionException, InterruptedException, IOException {
    Payment payment = paymentService.findById(messageId).orElse(null);
    if (payment == null) return new ResponseEntity<>(HttpStatus.NOT_FOUND);

    if (!payment.isPaidFlag()) {
      // FIX: sometimes we miss a payment event so if this payment is not paid we try to call
      // paymentService
      if (paymentService != null) {
        PaymentInfoResponse paymentInfo = paymentService.checkPayment(payment);
        if (paymentInfo != null) {
          payment.setPaidFlag(paymentInfo.isPaid());
          paymentService.save(payment);
        }
      }
    }

    ApiPaymentMessage apiPaymentMessage =
        ApiPaymentMessage.builder()
            .messageId(payment.getId())
            .dueDate(
                Optional.ofNullable(payment.getDueDate())
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
