package it.ioapp.com.reminder;

import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.junit.Before;
import org.junit.Test;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.runner.RunWith;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import it.ioapp.com.reminder.model.Reminder;
import it.ioapp.com.reminder.producer.ReminderProducer;
import it.ioapp.com.reminder.restclient.servicemessages.model.NotificationInfo;
import it.ioapp.com.reminder.restclient.servicemessages.model.NotificationType;
import it.ioapp.com.reminder.service.ReminderService;
import it.ioapp.com.reminder.util.Constants;

@SpringBootTest(classes = Application.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@RunWith(SpringRunner.class)
@AutoConfigureMockMvc
@ExtendWith(MockitoExtension.class)
public class ReminderServiceTest extends AbstractMock {

    @Autowired
    ReminderService reminderService;

    @MockBean
    ReminderProducer remProdMock;

    @MockBean
    it.ioapp.com.reminder.restclient.servicemessages.api.DefaultApi defaultServiceMessagesApiMock;

    @Before
    public void setUp() {
        before();
    }

    @Test
    @DisplayName("it should not save reminder if producer throws")
    public void test_getMessageToNotify_producerThrowsJsonProcessingException() throws JsonProcessingException {
        List<Reminder> reminders = new ArrayList<>();
        reminders.add(selectReminderMockObject("type", "1", "GENERIC", "AAABBB77Y66A444A", "123456", 3));
        mockGetReadMessageToNotifyWithResponse(reminders);
        mockGetPaidMessageToNotifyWithResponse(new ArrayList<>());
        Mockito.doThrow(JsonProcessingException.class).doNothing().when(remProdMock).sendReminder(
                Mockito.any(Reminder.class),
                Mockito.any(KafkaTemplate.class), Mockito.any(ObjectMapper.class),
                Mockito.anyString());
        reminderService.getMessageToNotify("0");
        Mockito.verify(mockRepository, times(0)).save(Mockito.any(Reminder.class));
    }

    @Test
    @DisplayName("it should not save reminder if payment check throws")
    public void test_getMessageToNotify_producerThrowsHttpServerErrorException() throws JsonProcessingException {
        List<Reminder> reminders = new ArrayList<>();
        Reminder rem = selectReminderMockObject("type", "1", "PAYMENT", "AAABBB77Y66A444A", "123456", 3);
        reminders.add(rem);
        mockGetReadMessageToNotifyWithResponse(reminders);
        mockGetPaidMessageToNotifyWithResponse(new ArrayList<>());
        proxyKo(null);
        reminderService.getMessageToNotify("0");
        String expectedRptId = rem.getRptId();
        Assertions.assertThrows(HttpServerErrorException.class,
                () -> mockDefaultApi.getPaymentInfo(expectedRptId, Constants.X_CLIENT_ID));
    }

    @Test
    @DisplayName("it should return an empty list if reminder with given rptId is not found")
    public void test_getPaymentsByRptid_returnEmptyResults() {
        Mockito.when(mockRepository.getPaymentByRptId(Mockito.anyString(), Mockito.anyString())).thenReturn(List.of());
        List<Reminder> results = reminderService.getPaymentsByRptid("0");
        Assertions.assertTrue(results.isEmpty());
    }

    @Test
    @DisplayName("it should return a list with elements if reminder with given rptId is found")
    public void test_getPaymentsByRptid_returnResults() {
        Mockito.when(mockRepository.getPaymentByRptId(Mockito.anyString(), Mockito.anyString())).thenReturn(List.of(new Reminder()));
        List<Reminder> results = reminderService.getPaymentsByRptid("0");
        Assertions.assertTrue(!results.isEmpty());
    }

    // ###############################
    // SendReminderNotification
    // ###############################

    @Test
    @DisplayName("it should send a Read reminder notification for GENERIC messages")
    public void test_sendReminderNotification_unreadNotification() {
        Reminder reminder = selectReminderMockObject("type", "1", "GENERIC", "AAABBB77Y66A444A", "123456", 3);
        reminderService.sendReminderNotification(reminder);
        NotificationInfo expected = new NotificationInfo().fiscalCode(reminder.getFiscalCode())
                .messageId(reminder.getId()).notificationType(NotificationType.REMINDER_READ);
        verify(defaultServiceMessagesApiMock, times(1)).notify(expected);
    }

    @Test
    @DisplayName("it should send a Payment reminder notification for PAYMENT messages")
    public void test_sendReminderNotification_unpaidNotification() {
        Reminder reminder = selectReminderMockObject("type", "1", "PAYMENT", "AAABBB77Y66A444A", "123456", 3);
        reminderService.sendReminderNotification(reminder);
        NotificationInfo expected = new NotificationInfo().fiscalCode(reminder.getFiscalCode())
                .messageId(reminder.getId()).notificationType(NotificationType.REMINDER_PAYMENT);
        verify(defaultServiceMessagesApiMock, times(1)).notify(expected);
    }

    @Test
    @DisplayName("it should send a Last Payment reminder notification for PAYMENT messages with due date expiring tomorrow")
    public void test_sendReminderNotification_unpaidLastNotification() {
        Reminder reminder = selectReminderMockObject("type", "1", "PAYMENT", "AAABBB77Y66A444A", "123456", 3);
        reminder.setDueDate(LocalDateTime.now().plusDays(1));
        reminderService.sendReminderNotification(reminder);
        NotificationInfo expected = new NotificationInfo().fiscalCode(reminder.getFiscalCode())
                .messageId(reminder.getId()).notificationType(NotificationType.REMINDER_PAYMENT_LAST);
        verify(defaultServiceMessagesApiMock, times(1)).notify(expected);
    }

    @Test
    @DisplayName("it should fire&forget notification if notify endpoint returns not found")
    public void test_sendReminderNotification_notificationNotSent() {
        Reminder reminder = selectReminderMockObject("type", "1", "PAYMENT", "AAABBB77Y66A444A", "123456", 3);
        Mockito.doThrow(new HttpClientErrorException(HttpStatus.NOT_FOUND)).doNothing()
                .when(defaultServiceMessagesApiMock).notify(Mockito.any(NotificationInfo.class));
        Assertions.assertDoesNotThrow(() -> reminderService.sendReminderNotification(reminder));
    }

    @Test
    @DisplayName("it should throw if notify endpoint is temporary down")
    public void test_sendReminderNotification_notificationSend_KO() {
        Reminder reminder = selectReminderMockObject("type", "1", "PAYMENT", "AAABBB77Y66A444A", "123456", 3);
        Mockito.doThrow(new HttpClientErrorException(HttpStatus.SERVICE_UNAVAILABLE)).doNothing()
                .when(defaultServiceMessagesApiMock).notify(Mockito.any(NotificationInfo.class));
        Assertions.assertThrows(HttpClientErrorException.class,
                () -> reminderService.sendReminderNotification(reminder));
    }

}
