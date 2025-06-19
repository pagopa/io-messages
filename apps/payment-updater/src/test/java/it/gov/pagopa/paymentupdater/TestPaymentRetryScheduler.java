package it.gov.pagopa.paymentupdater;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.quartz.SchedulerException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit4.SpringRunner;

import com.fasterxml.jackson.core.JsonProcessingException;

import it.gov.pagopa.paymentupdater.model.PaymentRetry;
import it.gov.pagopa.paymentupdater.producer.PaymentProducer;
import it.gov.pagopa.paymentupdater.scheduler.PaymentRetryToNotifyJob;

@SpringBootTest(classes = Application.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@RunWith(SpringRunner.class)
@AutoConfigureMockMvc
@Import(it.gov.pagopa.paymentupdater.KafkaTestContainersConfiguration.class)
@DirtiesContext
@EmbeddedKafka(partitions = 1, brokerProperties = { "listeners=PLAINTEXT://localhost:9093", "port=9093" })

public class TestPaymentRetryScheduler extends AbstractMock {
	
	@Autowired
    private PaymentRetryToNotifyJob job;
	
	@MockBean
	PaymentProducer producer;
	
	@Value("${kafka.paymentupdates}")
	private String producerTopic;
	
	@Value("${scheduler.retrytonotify.size}")
	private int size;
	
	@Test
	public void test_PaymentRetryScheduler() throws SchedulerException, InterruptedException, JsonProcessingException, ExecutionException {
		List<PaymentRetry> list = new ArrayList<>();
		list.add(getPaymentRetry());
		list.add(getPaymentRetry());
		Page<PaymentRetry> retryList = new PageImpl<>(list);
		mockFindTopElements(retryList);

		job.execute(null);
		mockDelete(list);
		assertTrue(true);
	}
}
