package it.gov.pagopa.paymentupdater;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

import org.junit.Test;
import org.junit.jupiter.api.Assertions;
import org.junit.runner.RunWith;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit4.SpringRunner;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import it.gov.pagopa.paymentupdater.consumer.MessageKafkaConsumer;
import it.gov.pagopa.paymentupdater.consumer.PaymentKafkaConsumer;
import it.gov.pagopa.paymentupdater.dto.payments.Creditor;
import it.gov.pagopa.paymentupdater.dto.payments.PaymentRoot;
import it.gov.pagopa.paymentupdater.dto.payments.Transfer;
import it.gov.pagopa.paymentupdater.model.Payment;
import it.gov.pagopa.paymentupdater.model.PaymentRetry;
import it.gov.pagopa.paymentupdater.producer.PaymentProducer;

@SpringBootTest(classes = Application.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@RunWith(SpringRunner.class)
@AutoConfigureMockMvc
@Import(it.gov.pagopa.paymentupdater.KafkaTestContainersConfiguration.class)
@DirtiesContext
@EmbeddedKafka(partitions = 1, brokerProperties = { "listeners=PLAINTEXT://localhost:9093", "port=9093" })
public class PaymentKafkaConsumerTest extends AbstractMock {

	@Autowired
	MessageKafkaConsumer messageKafkaConsumer;

	@Autowired
	PaymentKafkaConsumer paymentEventKafkaConsumer;

	@Autowired
	ObjectMapper mapper;

	@MockBean
	PaymentProducer producer;

	@Value("${kafka.paymentupdates}")
	private String producerTopic;

	public void test_paymentEventKafkaConsumer(List<Payment> payments, boolean producerKo)
			throws InterruptedException, JsonProcessingException, ExecutionException {
		mockSaveWithResponse(selectReminderMockObject("", "1", "GENERIC", "AAABBB77Y66A444A", 3,
				"ALSDK54654asdA1234567890200", "ALSDK54654asd", "A1234567890200"));
		mockGetPaymentByRptId(payments);

		Transfer transfer = getPaymentRoot().getTransferList().get(0);
		String transferString = transfer.getAmount().concat(
				transfer.getCompanyName().concat(
						transfer.getFiscalCodePA().concat(
								transfer.getRemittanceInformation().concat(transfer.getTransferCategory()))));

		if (producerKo) {
			Mockito.when(mockPaymentRetryRepository.save(Mockito.any(PaymentRetry.class)))
					.thenReturn(new PaymentRetry());
			Mockito.when(producer.sendPaymentUpdate(Mockito.anyString(), Mockito.any(), Mockito.anyString()))
					.thenThrow(new RuntimeException());
			Assertions.assertThrows(RuntimeException.class,
					() -> paymentEventKafkaConsumer.paymentKafkaListener(getPaymentRoot()));

		} else {
			paymentEventKafkaConsumer.paymentKafkaListener(getPaymentRoot());
			Assertions.assertNotNull(transferString);
			Assertions.assertEquals(0L, paymentEventKafkaConsumer.getLatch().getCount());
		}

	}

	public void test_paymentEventKafkaConsumerSkipPayment(List<Payment> payments)
			throws InterruptedException, JsonProcessingException {
		mockSaveWithResponse(selectReminderMockObject("", "1", "GENERIC", "AAABBB77Y66A444A", 3,
				"ALSDK54654asdA1234567890200", "ALSDK54654asd", "A1234567890200"));

		mockGetPaymentByRptId(payments);

		PaymentRoot root = getPaymentRoot();
		Creditor creditor = root.getCreditor();
		creditor.setIdPA(null);
		root.setCreditor(creditor);

		Transfer transfer = root.getTransferList().get(0);
		String transferString = transfer.getAmount().concat(
				transfer.getCompanyName().concat(
						transfer.getFiscalCodePA().concat(
								transfer.getRemittanceInformation().concat(transfer.getTransferCategory()))));
		paymentEventKafkaConsumer.paymentKafkaListener(root);
		Assertions.assertNotNull(transferString);
		Mockito.verify(mockRepository, Mockito.times(0)).getPaymentByRptId(Mockito.anyString());
		Assertions.assertEquals(0L, paymentEventKafkaConsumer.getLatch().getCount());
	}

	@Test
	public void test_paymentEventKafkaConsumerPaymentsIsNotEmpty()
			throws InterruptedException, JsonProcessingException, ExecutionException {
		List<Payment> payments = new ArrayList<>();
		payments.add(selectReminderMockObject("", "1", "GENERIC", "AAABBB77Y66A444A", 3, "ALSDKdcoekroicjre200",
				"ALSDKdcoek", "roicjre200"));
		test_paymentEventKafkaConsumer(payments, false);
	}

	@Test
	public void test_paymentEventKafkaConsumerPaymentsIsNotEmptyProducerKO()
			throws InterruptedException, JsonProcessingException, ExecutionException {
		List<Payment> payments = new ArrayList<>();
		payments.add(selectReminderMockObject("", "1", "GENERIC", "AAABBB77Y66A444A", 3, "ALSDKdcoekroicjre200",
				"ALSDKdcoek", "roicjre200"));
		test_paymentEventKafkaConsumer(payments, true);
	}

	@Test
	public void test_paymentEventKafkaConsumerPaymentsIsNotEmptyButToSkip()
			throws InterruptedException, JsonProcessingException {
		List<Payment> payments = new ArrayList<>();
		payments.add(selectReminderMockObject("", "1", "GENERIC", "AAABBB77Y66A444A", 3, "ALSDKdcoekroicjre200",
				"ALSDKdcoek", "roicjre200"));
		test_paymentEventKafkaConsumerSkipPayment(payments);
	}

	@Test
	public void test_paymentEventKafkaConsumerPaymentsIsEmpty()
			throws InterruptedException, JsonProcessingException, ExecutionException {
		List<Payment> payments = new ArrayList<>();
		test_paymentEventKafkaConsumer(payments, false);
	}

}
