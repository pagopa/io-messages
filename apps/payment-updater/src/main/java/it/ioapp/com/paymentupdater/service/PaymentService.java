package it.ioapp.com.paymentupdater.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import it.ioapp.com.paymentupdater.dto.PaymentInfoResponse;
import it.ioapp.com.paymentupdater.model.Payment;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

public interface PaymentService {

  void save(Payment reminder);

  PaymentInfoResponse checkPayment(Payment payment)
      throws JsonProcessingException, InterruptedException, ExecutionException, IOException;

  Optional<Payment> findById(String messageId);

  List<Payment> getPaymentsByRptid(String rptid);

  int countById(String id);
}
