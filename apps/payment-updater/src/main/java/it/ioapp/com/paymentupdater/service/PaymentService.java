package it.ioapp.com.paymentupdater.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import it.ioapp.com.paymentupdater.dto.ProxyResponse;
import it.ioapp.com.paymentupdater.model.Payment;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

public interface PaymentService {

  void save(Payment reminder);

  ProxyResponse checkPayment(Payment payment)
      throws JsonProcessingException, InterruptedException, ExecutionException;

  Optional<Payment> findById(String messageId);

  List<Payment> getPaymentsByRptid(String rptid);

  int countById(String id);
}
