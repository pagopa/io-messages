package it.ioapp.com.paymentupdater.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import it.ioapp.com.paymentupdater.model.PaymentRetry;
import it.ioapp.com.paymentupdater.repository.PaymentRetryRepository;
@Service
@Transactional
public class PaymentRetryServiceImpl implements PaymentRetryService {

	@Autowired PaymentRetryRepository paymentRetryRepository;

	@Override
	public List<PaymentRetry> findAll() {
		return paymentRetryRepository.findAll();
	}

	@Override
	public PaymentRetry save(PaymentRetry retry) {
		return paymentRetryRepository.save(retry);
	}

	@Override
	public List<PaymentRetry> getPaymentRetryByNoticeNumberAndFiscalCode(String noticeNumber, String fiscalCode) {
		return paymentRetryRepository.getPaymentRetryByNoticeNumberAndFiscalCode(noticeNumber, fiscalCode);
	}

	@Override
	public void delete(PaymentRetry retry) {
		 paymentRetryRepository.delete(retry);
	}

	@Override
	public Page<PaymentRetry> findTopElements(int size) {
		return paymentRetryRepository.findTopElements(Pageable.ofSize(size));
	}

}
