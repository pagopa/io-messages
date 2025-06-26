package it.ioapp.com.paymentupdater.service;

import it.ioapp.com.paymentupdater.model.PaymentRetry;
import java.util.List;
import org.springframework.data.domain.Page;

public interface PaymentRetryService {

  List<PaymentRetry> findAll();

  PaymentRetry save(PaymentRetry retry);

  List<PaymentRetry> getPaymentRetryByNoticeNumberAndFiscalCode(
      String noticeNumber, String fiscalCode);

  void delete(PaymentRetry retry);

  Page<PaymentRetry> findTopElements(int size);
}
