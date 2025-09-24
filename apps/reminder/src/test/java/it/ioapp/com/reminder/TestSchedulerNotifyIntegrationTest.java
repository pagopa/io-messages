package it.ioapp.com.reminder;

import com.fasterxml.jackson.core.JsonProcessingException;
import dto.messageStatus;
import it.ioapp.com.reminder.model.Reminder;
import it.ioapp.com.reminder.producer.ReminderProducer;
import it.ioapp.com.reminder.restclient.pagopaecommerce.ApiClient;
import it.ioapp.com.reminder.restclient.pagopaecommerce.api.PaymentRequestsApi;
import it.ioapp.com.reminder.scheduler.CheckRemindersToNotifyJob;
import java.util.ArrayList;
import java.util.List;
import org.junit.Before;
import org.junit.Test;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.quartz.JobKey;
import org.quartz.SchedulerException;
import org.quartz.impl.JobDetailImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.junit4.SpringRunner;

@SpringBootTest(
    classes = Application.class,
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@RunWith(SpringRunner.class)
@AutoConfigureMockMvc
@ExtendWith(MockitoExtension.class)
public class TestSchedulerNotifyIntegrationTest extends AbstractMock {

  private static final String GENERIC = "GENERIC";
  private static final String PAYMENT = "PAYMENT";
  private static final String EMPTY = "empty";
  private static final String FULL = "full";

  @Autowired private CheckRemindersToNotifyJob job;

  @MockBean ReminderProducer reminderProducer;

  @Autowired private PaymentRequestsApi paymentRequestsApi;

  @Mock private JobExecutionContext ctx;

  @Value("${paymentupdater.url}")
  private String urlPayment;

  @Before
  public void setUp() {
    ApiClient mockClient = Mockito.mock(ApiClient.class);
    Mockito.when(paymentRequestsApi.getApiClient()).thenReturn(mockClient);

    Mockito.doNothing().when(mockClient).setApiKey(Mockito.anyString());
    Mockito.when(mockClient.setBasePath(Mockito.anyString())).thenReturn(mockClient);

    before();
  }

  public void test_CheckRemindersToNotifyJob(
      boolean isRead, String type1, String type2, String contentType) {
    List<Reminder> modifiedList = selectListReminderMockObject(type1);
    JobDataMap jobDataMap = new JobDataMap();
    JobDetailImpl jobDetailMock = new JobDetailImpl();
    jobDetailMock.setKey(new JobKey("a-job-key-0"));
    jobDataMap.put("shard", "0");
    Mockito.when(ctx.getMergedJobDataMap()).thenReturn(jobDataMap);
    Mockito.when(ctx.getJobDetail()).thenReturn(jobDetailMock);
    if (isRead) {
      Reminder newReminder = modifiedList.get(1);
      newReminder.setReadFlag(true);
      modifiedList.add(newReminder);
    }
    mockGetReadMessageToNotifyWithResponse(modifiedList);
    mockGetPaidMessageToNotifyWithResponse(selectListReminderMockObject(type2));
    getMockRestGetForEntity(
        messageStatus.class,
        urlPayment.concat("123456"),
        selectMessageStatusMockObject("1", true),
        HttpStatus.OK);
    mockSaveWithResponse(
        selectReminderMockObject("", "1", contentType, "AAABBB77Y66A444A", "123456", 3));
    mockFindIdWithResponse(
        selectReminderMockObject("", "1", contentType, "AAABBB77Y66A444A", "123456", 3));
    job.execute(ctx);
    Assertions.assertTrue(true);
  }

  @Test
  public void test_ecommerce_dueDateIsNotNull()
      throws SchedulerException, InterruptedException, JsonProcessingException {
    pagoPAEcommerce(true);
    test_CheckRemindersToNotifyJob(true, FULL, FULL, GENERIC);
  }

  @Test
  public void test_CheckRemindersToNotifyJob_AllResponse_OK()
      throws SchedulerException, InterruptedException, JsonProcessingException {
    pagoPAEcommerce409();
    test_CheckRemindersToNotifyJob(true, FULL, FULL, GENERIC);
  }

  @Test
  public void test_CheckRemindersToNotifyJob_AllResponse_Paid_OK()
      throws SchedulerException, InterruptedException, JsonProcessingException {
    pagoPAEcommerce409();
    test_CheckRemindersToNotifyJob(false, FULL, FULL, PAYMENT);
  }

  @Test
  public void test_CheckRemindersToNotifyJob_NoResponse_OK()
      throws SchedulerException, InterruptedException {
    test_CheckRemindersToNotifyJob(false, EMPTY, EMPTY, GENERIC);
  }

  @Test
  public void test_CheckRemindersToNotifyJob_AllResponse_Paid_WithEcommerce_409()
      throws SchedulerException, InterruptedException, JsonProcessingException {
    pagoPAEcommerce409();
    List<Reminder> listRem = new ArrayList<>();
    listRem.add(selectReminderMockObject("", "1", PAYMENT, "AAABBB77Y66A444A", "123456", 3));
    mockGetPaymentByRptId(listRem);
    test_CheckRemindersToNotifyJob(false, FULL, FULL, PAYMENT);
  }
}
