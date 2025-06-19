package it.ioapp.com.paymentupdater.service;

import java.util.List;

import org.springframework.data.domain.Page;

import it.ioapp.com.paymentupdater.model.PaymentRetry;

public interface PaymentRetryService {

	List<PaymentRetry> findAll();

	PaymentRetry save(PaymentRetry retry);

	List<PaymentRetry> getPaymentRetryByNoticeNumberAndFiscalCode(String noticeNumber, String fiscalCode);

	void delete(PaymentRetry retry);

	Page<PaymentRetry> findTopElements(int size);

}
