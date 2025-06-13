package it.ioapp.com.reminder;

import com.fasterxml.jackson.core.JsonProcessingException;
import dto.FeatureLevelType;
import it.ioapp.com.reminder.consumer.MessageKafkaConsumer;
import it.ioapp.com.reminder.consumer.MessageStatusKafkaConsumer;
import it.ioapp.com.reminder.consumer.PaymentUpdatesKafkaConsumer;
import it.ioapp.com.reminder.consumer.ReminderKafkaConsumer;
import it.ioapp.com.reminder.dto.PaymentMessage;
import it.ioapp.com.reminder.model.Reminder;
import it.ioapp.com.reminder.producer.ReminderProducer;
import java.time.LocalDateTime;
import org.junit.Before;
import org.junit.Test;
import org.junit.jupiter.api.Assertions;
import org.junit.runner.RunWith;
import org.mockito.Mockito;
import org.quartz.SchedulerException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit4.SpringRunner;

@SpringBootTest(
    classes = Application.class,
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@RunWith(SpringRunner.class)
@AutoConfigureMockMvc
@Import(it.ioapp.com.reminder.KafkaTestContainersConfiguration.class)
@DirtiesContext
@EmbeddedKafka(
    partitions = 1,
    brokerProperties = {"listeners=PLAINTEXT://localhost:9092", "port=9092"})
public class MessageKafkaConsumerTest extends AbstractMock {

  private static final String GENERIC = "GENERIC";
  private static final String PAYMENT = "PAYMENT";

  @Autowired private ReminderProducer producer;

  @Autowired private KafkaTemplate<String, String> kafkaTemplate;

  @Autowired PaymentUpdatesKafkaConsumer paymentUpdatesEventKafkaConsumer;

  @Autowired ReminderKafkaConsumer consumerRem;

  @Autowired MessageStatusKafkaConsumer consumerMessStatus;

  @Autowired MessageKafkaConsumer messageKafkaConsumer;

  @Value("${notification.notifyEndpoint}")
  private String notifyEndpoint;

  @Before
  public void setUp() {
    before();
  }

  public void MockSchedulerNotifyIntegrationReminderKafkaConsumerTest()
      throws JsonProcessingException {
    producer.sendReminder(
        selectReminderMockObject("", "1", GENERIC, "AAABBB77Y66A444A", "123456", 3),
        kafkaTemplate,
        mapper,
        "message-send");
    consumerRem.reminderKafkaListener(
        selectReminderMockObject("", "1", GENERIC, "AAABBB77Y66A444A", "123456", 3));
    Assertions.assertTrue(consumerRem.getPayload().contains(""));
    Assertions.assertEquals(0L, consumerRem.getLatch().getCount());
  }

  public void MockSchedulerNotifyIntegrationPaymentUpdatesKafkaConsumerTest(
      String contentType, String contentType2, String source) {
    mockGetPaymentByNoticeNumberAndFiscalCodeWithResponse(
        selectReminderMockObject("", "1", contentType, "AAABBB77Y66A444A", "123456", 3));
    mockSaveWithResponse(
        selectReminderMockObject("", "1", contentType2, "AAABBB77Y66A444A", "123456", 3));
    paymentUpdatesEventKafkaConsumer.paymentUpdatesKafkaListener(
        getPaymentMessage(
            "12", "123", "456", true, null, 5d, source, "BBBPPP77J99A888A", LocalDateTime.now()));
    Assertions.assertTrue(paymentUpdatesEventKafkaConsumer.getPayload().contains("paid=true"));
    Assertions.assertEquals(0L, paymentUpdatesEventKafkaConsumer.getLatch().getCount());
  }

  public void MockMessageStatusKafkaConsumerTest(boolean isRead) {
    mockSaveWithResponse(
        selectReminderMockObject("", "1", GENERIC, "AAABBB77Y66A444A", "123456", 3));
    mockFindIdWithResponse(
        selectReminderMockObject("", "1", GENERIC, "AAABBB77Y66A444A", "123456", 3));
    consumerMessStatus.messageStatusKafkaListener(selectMessageStatusMockObject("1", isRead));
    Assertions.assertTrue(consumerMessStatus.getPayload().contains("messageId"));
    Assertions.assertEquals(0L, consumerMessStatus.getLatch().getCount());
  }

  @Test
  public void test_scheduleMockSchedulerNotifyIntegrationTest2_KO()
      throws SchedulerException, InterruptedException, JsonProcessingException {
    Mockito.when(restTemplate.postForObject(Mockito.anyString(), Mockito.any(), Mockito.any()))
        .thenThrow(new RuntimeException("500!"));
    MockSchedulerNotifyIntegrationReminderKafkaConsumerTest();
  }

  @SuppressWarnings({"static-access", "rawtypes"})
  @Test
  public void test_scheduleMockSchedulerNotifyIntegrationTest2_OK()
      throws SchedulerException, InterruptedException, JsonProcessingException {
    Mockito.when(restTemplate.postForObject(Mockito.anyString(), Mockito.any(), Mockito.any()))
        .thenReturn(new ResponseEntity(HttpStatus.OK).accepted().body("{}"));
    MockSchedulerNotifyIntegrationReminderKafkaConsumerTest();
  }

  @Test
  public void test_scheduleMockSchedulerNotifyIntegrationTest_GENERIC_OK()
      throws SchedulerException, InterruptedException, JsonProcessingException {
    MockSchedulerNotifyIntegrationPaymentUpdatesKafkaConsumerTest(GENERIC, GENERIC, "payments");
  }

  @Test
  public void test_scheduleMockSchedulerNotifyIntegrationTest_PAYMENTS_OK()
      throws SchedulerException, InterruptedException, JsonProcessingException {
    MockSchedulerNotifyIntegrationPaymentUpdatesKafkaConsumerTest(PAYMENT, PAYMENT, "payments");
  }

  @Test
  public void test_MessageStatusKafkaConsumerTest_Read_MESSAGES_OK()
      throws SchedulerException, InterruptedException, JsonProcessingException {
    MockMessageStatusKafkaConsumerTest(true);
  }

  public void MockMessageKafkaConsumerConsumerTest_MESSAGES(String contentType) throws Exception {
    Reminder mockObj =
        selectReminderMockObject("", "1", contentType, "AAABBB77Y66A444A", "123456", 3);
    mockObj.setContent_paymentData_noticeNumber("12345");
    mockObj.setContent_paymentData_payeeFiscalCode("fiscal");
    mockObj.setInsertionDate(LocalDateTime.now());
    mockObj.setSenderServiceId("id");
    mockObj.setFeature_level_type(FeatureLevelType.ADVANCED);
    messageKafkaConsumer.messageKafkaListener(mockObj);
    mockSaveWithResponse(mockObj);
    Assertions.assertTrue(messageKafkaConsumer.getPayload().contains("paidFlag=false"));
    Assertions.assertEquals(0L, messageKafkaConsumer.getLatch().getCount());
  }

  @Test
  public void test_MessageKafkaConsumerConsumerTest_MESSAGES_OK() throws Exception {
    MockMessageKafkaConsumerConsumerTest_MESSAGES(GENERIC);
  }

  @Test
  public void test_MessageKafkaConsumerConsumerTest_MESSAGES_PAYMENT() throws Exception {
    mockGetPaymentByNoticeNumberAndFiscalCode();
    MockMessageKafkaConsumerConsumerTest_MESSAGES(PAYMENT);
  }

  @Test
  public void MockSchedulerPaymentUpdatesKafkaConsumerTest() {
    Reminder reminder = selectReminderMockObject("", "1", PAYMENT, "AAABBB77Y66A444A", "123456", 3);

    mockFindIdWithResponse(reminder);
    mockSaveWithResponse(reminder);

    PaymentMessage message =
        getPaymentMessage(
            "12",
            "123",
            "456",
            true,
            null,
            5d,
            "payments",
            "BBBPPP77J99A888A",
            LocalDateTime.now());
    paymentUpdatesEventKafkaConsumer.paymentUpdatesKafkaListener(message);

    Assertions.assertTrue(paymentUpdatesEventKafkaConsumer.getPayload().contains("paid=true"));
    Assertions.assertEquals(0L, paymentUpdatesEventKafkaConsumer.getLatch().getCount());
  }
}
