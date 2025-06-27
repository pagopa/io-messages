package it.ioapp.com.reminder;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import dto.MessageContentType;
import dto.message;
import dto.messageStatus;
import it.ioapp.com.reminder.dto.PaymentMessage;
import it.ioapp.com.reminder.model.Reminder;
import it.ioapp.com.reminder.producer.ReminderProducer;
import it.ioapp.com.reminder.repository.ReminderRepository;
import it.ioapp.com.reminder.restclient.pagopaecommerce.api.PaymentRequestsApi;
import it.ioapp.com.reminder.restclient.pagopaecommerce.model.PaymentDuplicatedStatusFault;
import it.ioapp.com.reminder.restclient.pagopaecommerce.model.PaymentDuplicatedStatusFaultPaymentProblemJson;
import it.ioapp.com.reminder.restclient.pagopaecommerce.model.PaymentDuplicatedStatusFaultPaymentProblemJson.FaultCodeCategoryEnum;
import it.ioapp.com.reminder.restclient.pagopaecommerce.model.PaymentRequestsGetResponse;
import it.ioapp.com.reminder.service.ReminderServiceImpl;
import java.nio.charset.Charset;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.Rule;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mockito;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

public class AbstractMock {

  private static final String EMPTY = "empty";
  private static final String FULL = "full";
  private static final String NULL = "null";

  @Rule public MockitoRule rule = MockitoJUnit.rule();

  @MockBean protected RestTemplate restTemplate;

  @MockBean protected PaymentRequestsApi mockPaymentApi;

  @MockBean protected ReminderRepository mockRepository;

  @InjectMocks protected ReminderServiceImpl service;

  @Autowired ObjectMapper mapper;
  @Autowired ReminderProducer producer;

  @Value("${paymentupdater.url}")
  private String urlPayment;

  protected void mockSaveWithResponse(Reminder returnReminder) {
    Mockito.when(mockRepository.save(Mockito.any(Reminder.class))).thenReturn(returnReminder);
  }

  protected void mockFindIdWithResponse(Reminder returnReminder1) {
    Mockito.when(mockRepository.findById(Mockito.anyString()))
        .thenReturn(Optional.of(returnReminder1));
  }

  protected void mockGetPaymentByNoticeNumberAndFiscalCode() {
    List<Reminder> listReminder = new ArrayList<>();
    Mockito.when(
            mockRepository.getPaymentByNoticeNumberAndFiscalCode(
                Mockito.anyString(), Mockito.anyString()))
        .thenReturn(listReminder);
  }

  protected void mockGetPaymentsByRptId(Reminder reminder) {
    List<Reminder> listReminder = new ArrayList<>();
    listReminder.add(reminder);
    Mockito.when(mockRepository.getPaymentByRptId(Mockito.anyString(), Mockito.anyString()))
        .thenReturn(listReminder);
  }

  protected void pagoPAEcommerce409() throws JsonProcessingException {
    PaymentDuplicatedStatusFaultPaymentProblemJson dto =
        new PaymentDuplicatedStatusFaultPaymentProblemJson();
    dto.setFaultCodeCategory(FaultCodeCategoryEnum.PAYMENT_DUPLICATED);
    dto.setFaultCodeDetail(PaymentDuplicatedStatusFault.PPT_PAGAMENTO_DUPLICATO);
    dto.setTitle("title");
    HttpServerErrorException errorResponse =
        new HttpServerErrorException(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "",
            mapper.writeValueAsString(dto).getBytes(),
            Charset.defaultCharset());
    Mockito.when(mockPaymentApi.getPaymentRequestInfo(ArgumentMatchers.anyString()))
        .thenThrow(errorResponse);
  }

  protected void pagoPAEcommerce(boolean dueDateIsNull) throws JsonProcessingException {
    PaymentRequestsGetResponse mockPaymentRequestsGetResponse = new PaymentRequestsGetResponse();
    if (dueDateIsNull) {
      mockPaymentRequestsGetResponse.setDueDate("2022-05-16");
    }
    mockPaymentRequestsGetResponse.setAmount(80);
    Mockito.when(mockPaymentApi.getPaymentRequestInfo(ArgumentMatchers.anyString()))
        .thenReturn(mockPaymentRequestsGetResponse);
  }

  public void mockGetPaymentByNoticeNumberAndFiscalCodeWithResponse(Reminder reminder) {
    List<Reminder> listReminder = new ArrayList<>();
    listReminder.add(reminder);
    Mockito.when(
            mockRepository.getPaymentByNoticeNumberAndFiscalCode(
                Mockito.anyString(), Mockito.anyString()))
        .thenReturn(listReminder);
  }

  protected void mockGetReadMessageToNotifyWithResponse(List<Reminder> pageReturnReminder) {
    Mockito.when(
            mockRepository.getReadMessageToNotify(
                Mockito.anyString(),
                Mockito.anyString(),
                Mockito.anyInt(),
                Mockito.any(LocalDateTime.class),
                Mockito.any(PageRequest.class)))
        .thenReturn(new PageImpl<>(pageReturnReminder));
  }

  protected void mockGetPaidMessageToNotifyWithResponse(List<Reminder> pageReturnReminder) {
    Mockito.when(
            mockRepository.getPaidMessageToNotify(
                Mockito.anyString(),
                Mockito.anyString(),
                Mockito.anyInt(),
                Mockito.any(LocalDateTime.class),
                Mockito.any(LocalDate.class),
                Mockito.any(LocalDate.class),
                Mockito.any(PageRequest.class)))
        .thenReturn(new PageImpl<>(pageReturnReminder));
  }

  protected void mockDeleteReadMessageWithResponse(int retValue) {
    Mockito.when(mockRepository.deleteReadMessage(Mockito.anyInt(), Mockito.anyString()))
        .thenReturn(retValue);
  }

  protected void mockDeletePaidMessageWithResponse(int retValue) {
    Mockito.when(
            mockRepository.deletePaidMessage(
                Mockito.anyInt(), Mockito.anyString(), Mockito.any(LocalDate.class)))
        .thenReturn(retValue);
  }

  protected void mockGetPaymentByRptId(List<Reminder> rem) {
    Mockito.when(mockRepository.getPaymentByRptId(Mockito.anyString(), Mockito.anyString()))
        .thenReturn(rem);
  }

  protected List<Reminder> selectListReminderMockObject(String type) {
    List<Reminder> retList = null;
    Reminder returnReminder1 = null;

    switch (type) {
      case EMPTY:
        retList = new ArrayList<Reminder>();
        break;
      case FULL:
        retList = new ArrayList<Reminder>();
        returnReminder1 =
            selectReminderMockObject(type, "1", "GENERIC", "AAABBB77Y66A444A", "123456", 3);
        retList.add(returnReminder1);
        returnReminder1 =
            selectReminderMockObject(type, "2", "PAYMENT", "CCCDDD77Y66A444A", "123456", 3);
        retList.add(returnReminder1);
        break;
      case NULL:
        retList = null;
        break;
      default:
        retList = new ArrayList<Reminder>();
        break;
    }
    ;

    return retList;
  }

  protected Reminder selectReminderMockObject(
      String type,
      String id,
      String contentType,
      String fiscalCode,
      String noticeNumber,
      int numReminder) {
    Reminder returnReminder1 = null;
    switch (type) {
      case EMPTY:
        returnReminder1 = new Reminder();
      default:
        returnReminder1 = new Reminder();
        returnReminder1.setId(id);
        returnReminder1.setContent_type(MessageContentType.valueOf(contentType));
        returnReminder1.setFiscalCode(fiscalCode);
        returnReminder1.setContent_paymentData_noticeNumber(noticeNumber);
        returnReminder1.setRptId("ALSDK54654asdA1234567890200");
        returnReminder1.setDueDate(LocalDateTime.now());
    }
    ;
    return returnReminder1;
  }

  protected message selectMessageMockObject(
      String type, String id, String contentType, String fiscalCode, String noticeNumber) {
    message returnReminder1 = null;
    switch (type) {
      case EMPTY:
        returnReminder1 = new message();
      default:
        returnReminder1 = new message();
        returnReminder1.setId(id);
        returnReminder1.setContentType(MessageContentType.valueOf(contentType));
        ;
        returnReminder1.setFiscalCode(fiscalCode);
        returnReminder1.setContentPaymentDataNoticeNumber(noticeNumber);
        returnReminder1.setContentPaymentDataPayeeFiscalCode(fiscalCode);
        returnReminder1.setContentSubject("ASubject");
        returnReminder1.setSenderServiceId("ASenderServiceId");
        returnReminder1.setSenderUserId("ASenderUserId");
    }
    ;
    return returnReminder1;
  }

  protected messageStatus selectMessageStatusMockObject(String messageId, boolean isRead) {
    messageStatus messageStatus = new messageStatus();
    messageStatus.setId("ID");
    messageStatus.setMessageId(messageId);
    messageStatus.setIsRead(isRead);
    return messageStatus;
  }

  protected PaymentMessage getPaymentMessage(
      String messageId,
      String noticeNumber,
      String fiscalCodePayee,
      boolean paid,
      LocalDateTime d,
      Double amount,
      String source,
      String fiscalCode,
      LocalDateTime paymentDateTime) {
    PaymentMessage pm =
        new PaymentMessage(
            messageId,
            noticeNumber,
            fiscalCodePayee,
            paid,
            d,
            amount,
            source,
            fiscalCode,
            paymentDateTime);
    return pm;
  }

  protected void before() {
    service = new ReminderServiceImpl();
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  protected void getMockRestGetForEntity(
      Class classResult, String url, Object resp, HttpStatus status) {
    Mockito.when(restTemplate.getForEntity(url, classResult))
        .thenReturn(new ResponseEntity(resp, status));
  }
}
