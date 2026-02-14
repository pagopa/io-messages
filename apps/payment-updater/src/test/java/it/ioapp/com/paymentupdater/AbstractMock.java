package it.ioapp.com.paymentupdater;

import static org.mockito.Mockito.doNothing;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import dto.FeatureLevelType;
import dto.MessageContentType;
import dto.message;
import it.ioapp.com.paymentupdater.dto.PaymentMessage;
import it.ioapp.com.paymentupdater.dto.payments.Creditor;
import it.ioapp.com.paymentupdater.dto.payments.Debtor;
import it.ioapp.com.paymentupdater.dto.payments.DebtorPosition;
import it.ioapp.com.paymentupdater.dto.payments.Payer;
import it.ioapp.com.paymentupdater.dto.payments.PaymentInfo;
import it.ioapp.com.paymentupdater.dto.payments.PaymentRoot;
import it.ioapp.com.paymentupdater.dto.payments.Psp;
import it.ioapp.com.paymentupdater.dto.payments.Transfer;
import it.ioapp.com.paymentupdater.model.Payment;
import it.ioapp.com.paymentupdater.model.PaymentRetry;
import it.ioapp.com.paymentupdater.repository.PaymentRepository;
import it.ioapp.com.paymentupdater.repository.PaymentRetryRepository;
import it.ioapp.com.paymentupdater.restclient.pagopaecommerce.api.PaymentRequestsApi;
import it.ioapp.com.paymentupdater.restclient.pagopaecommerce.model.PaymentDuplicatedStatusFault;
import it.ioapp.com.paymentupdater.restclient.pagopaecommerce.model.PaymentDuplicatedStatusFaultPaymentProblemJson;
import it.ioapp.com.paymentupdater.restclient.pagopaecommerce.model.PaymentDuplicatedStatusFaultPaymentProblemJson.FaultCodeCategoryEnum;
import it.ioapp.com.paymentupdater.restclient.pagopaecommerce.model.PaymentRequestsGetResponse;
import it.ioapp.com.paymentupdater.restclient.pagopaecommerce.model.ValidationFaultPaymentUnavailable;
import it.ioapp.com.paymentupdater.restclient.pagopaecommerce.model.ValidationFaultPaymentUnavailableProblemJson;
import it.ioapp.com.paymentupdater.service.PaymentRetryServiceImpl;
import it.ioapp.com.paymentupdater.service.PaymentServiceImpl;
import java.nio.charset.Charset;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.Rule;
import org.junit.jupiter.api.Assertions;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

/** Abstract class for setting up common mock objects and methods used in tests. */
public abstract class AbstractMock {

  @Autowired ObjectMapper mapper;

  @Value("${interval.function}")
  private int intervalFunction;

  @Value("${attempts.max}")
  private int attemptsMax;

  @Rule public MockitoRule rule = MockitoJUnit.rule();

  @MockBean protected RestTemplate restTemplate;

  @MockBean protected PaymentRepository mockRepository;

  @MockBean protected PaymentRetryRepository mockPaymentRetryRepository;

  @InjectMocks PaymentRetryServiceImpl paymentRetryServiceImpl;

  @Mock PaymentServiceImpl paymentServiceImpl;

  @MockBean protected PaymentRequestsApi mockPaymentApi;

  protected void mockSaveWithResponse(Payment returnReminder) {
    Mockito.when(mockRepository.save(Mockito.any(Payment.class))).thenReturn(returnReminder);
  }

  protected void mockFindIdWithResponse(Payment returnReminder1) {
    Mockito.when(mockRepository.findById(Mockito.anyString()))
        .thenReturn(Optional.of(returnReminder1));
  }

  protected void mockFindIdWithResponse404() {
    Mockito.when(mockRepository.findById(Mockito.anyString()))
        .thenReturn(Optional.ofNullable(null));
  }

  protected void mockCountWithResults(Integer count) {
    Mockito.when(mockRepository.countById(Mockito.anyString())).thenReturn(count);
  }

  public void mockDelete(List<PaymentRetry> entity) {
    for (PaymentRetry e : entity) {
      doNothing().when(mockPaymentRetryRepository).delete(e);
    }
  }

  public void mockFindTopElements(Page<PaymentRetry> retryList) {
    Mockito.when(mockPaymentRetryRepository.findTopElements(Mockito.any(Pageable.class)))
        .thenReturn(retryList);
  }

  public void mockGetPaymentByRptId(List<Payment> payment) {
    Mockito.when(mockRepository.getPaymentByRptId(Mockito.anyString())).thenReturn(payment);
  }

  public void mockGetPaymentInfo() {
    PaymentRequestsGetResponse paymentRequest = new PaymentRequestsGetResponse();
    paymentRequest.setDueDate("2022-05-15");
    Mockito.when(mockPaymentApi.getPaymentRequestInfo(Mockito.anyString()))
        .thenReturn(paymentRequest);
  }

  public void mockGetPaymentInfoIsPaidTrue() throws JsonProcessingException {
    PaymentDuplicatedStatusFaultPaymentProblemJson problem =
        new PaymentDuplicatedStatusFaultPaymentProblemJson();

    problem.setFaultCodeDetail(PaymentDuplicatedStatusFault.PAA_PAGAMENTO_DUPLICATO);
    problem.setFaultCodeCategory(FaultCodeCategoryEnum.PAYMENT_DUPLICATED);

    HttpServerErrorException errorResponse =
        new HttpServerErrorException(
            HttpStatus.CONFLICT,
            "",
            mapper.writeValueAsString(problem).getBytes(),
            Charset.defaultCharset());

    Mockito.when(mockPaymentApi.getPaymentRequestInfo(Mockito.anyString()))
        .thenThrow(errorResponse);
  }

  public void mockGetPaymentInfoError() throws JsonProcessingException {
    ValidationFaultPaymentUnavailableProblemJson ecommerceResponse =
        new ValidationFaultPaymentUnavailableProblemJson();
    ecommerceResponse.setFaultCodeDetail(ValidationFaultPaymentUnavailable.PPT_AUTENTICAZIONE);
    HttpServerErrorException errorResponse =
        new HttpServerErrorException(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "",
            mapper.writeValueAsString(ecommerceResponse).getBytes(),
            Charset.defaultCharset());

    Mockito.when(mockPaymentApi.getPaymentRequestInfo(Mockito.anyString()))
        .thenThrow(errorResponse);
  }

  public void mockGetPaymentThrowError() throws JsonProcessingException {
    ValidationFaultPaymentUnavailableProblemJson ecommerceResponse =
        new ValidationFaultPaymentUnavailableProblemJson();
    ecommerceResponse.setFaultCodeDetail(ValidationFaultPaymentUnavailable.PPT_AUTENTICAZIONE);
    RuntimeException errorResponse =
        new RuntimeException(
            "Forced error for test: " + mapper.writeValueAsString(ecommerceResponse));

    Mockito.when(mockPaymentApi.getPaymentRequestInfo(Mockito.anyString()))
        .thenThrow(errorResponse);
  }

  protected Payment selectReminderMockObject(
      String type,
      String id,
      String contentType,
      String fiscalCode,
      int numReminder,
      String rptId,
      String paymentDataNoticeNumber,
      String paymentDataFiscalCode) {
    Payment returnReminder1 = new Payment();
    returnReminder1.setId(id);
    returnReminder1.setContent_type(MessageContentType.valueOf(contentType));
    returnReminder1.setFiscalCode(fiscalCode);
    returnReminder1.setRptId(rptId);
    returnReminder1.setDueDate(LocalDateTime.now());
    returnReminder1.setContent_paymentData_noticeNumber(paymentDataNoticeNumber);
    returnReminder1.setContent_paymentData_payeeFiscalCode(paymentDataFiscalCode);
    returnReminder1.setReadFlag(true);
    returnReminder1.setDateReminder(new ArrayList<>());
    returnReminder1.setLastDateReminder(LocalDateTime.of(2022, 01, 01, 1, 1));
    returnReminder1.setMaxPaidMessageSend(10);
    returnReminder1.setReadDate(LocalDateTime.of(2022, 01, 01, 1, 1));
    returnReminder1.setMaxReadMessageSend(10);
    returnReminder1.setContent_paymentData_amount(0.0);
    returnReminder1.setContent_paymentData_invalidAfterDueDate(true);
    returnReminder1.setContent_subject("");
    returnReminder1.setCreatedAt(1l);
    returnReminder1.setPending(false);
    returnReminder1.setSenderServiceId("");
    returnReminder1.setContent_paymentData_amount(0.0);
    returnReminder1.setTimeToLiveSeconds(5);
    returnReminder1.setFeature_level_type(FeatureLevelType.ADVANCED);
    returnReminder1.setSenderServiceId("");
    returnReminder1.setSenderUserId("");
    Assertions.assertEquals(1l, returnReminder1.getCreatedAt());
    Assertions.assertEquals(FeatureLevelType.ADVANCED, returnReminder1.getFeature_level_type());
    Assertions.assertEquals(true, returnReminder1.isReadFlag());
    Assertions.assertEquals(new ArrayList<>(), returnReminder1.getDateReminder());
    Assertions.assertEquals(
        LocalDateTime.of(2022, 01, 01, 1, 1), returnReminder1.getLastDateReminder());
    Assertions.assertEquals(10, returnReminder1.getMaxPaidMessageSend());
    Assertions.assertEquals(LocalDateTime.of(2022, 01, 01, 1, 1), returnReminder1.getReadDate());
    Assertions.assertEquals(10, returnReminder1.getMaxReadMessageSend());
    Assertions.assertEquals(0.0, returnReminder1.getContent_paymentData_amount());
    Assertions.assertEquals(true, returnReminder1.isContent_paymentData_invalidAfterDueDate());
    Assertions.assertEquals("", returnReminder1.getSenderUserId());
    Assertions.assertEquals(5, returnReminder1.getTimeToLiveSeconds());
    Assertions.assertEquals(false, returnReminder1.isPending());
    return returnReminder1;
  }

  // https://oauth.io.pagopa.it/authorize?client_id=01JWWZJQ9N6PMMZ0XBCK8XHYM0&scope=openid%20profile%20lollipop&response_type=code&redirect_uri=https%3A%2F%2Fapi-app.io.pagopa.it%2Fapi%2Fcdc%2Fv1%2Ffcb&nonce=F4Ozm46nf5KfxQ1cRhwRZKTc2YSuMjJEcE5xU1ljNXc&state=OS-kEC4EsW83ggeywapEYsfaiUJ0_BpTFIZ7sUi9BBs

  protected String selectPaymentMessageObject(
      String type,
      String messageId,
      String noticeNumber,
      String payeeFiscalCode,
      boolean paid,
      LocalDateTime dueDate,
      double amount,
      String source,
      String fiscalCode,
      LocalDateTime paymentDateTime)
      throws JsonProcessingException {
    PaymentMessage paymentMessage = null;
    paymentMessage =
        new PaymentMessage(
            messageId,
            noticeNumber,
            payeeFiscalCode,
            paid,
            dueDate,
            amount,
            source,
            fiscalCode,
            paymentDateTime);
    return mapper.writeValueAsString(paymentMessage);
  }

  protected PaymentRetry getPaymentRetry() {
    PaymentRetry retry = new PaymentRetry();
    LocalDateTime date = LocalDateTime.now();
    retry.setAmount(0);
    retry.setId("1");
    retry.setNoticeNumber("abc");
    retry.setPaid(true);
    retry.setMessageId("123");
    retry.setPayeeFiscalCode("ABC");
    retry.setSource("payments");
    retry.setDueDate(date.toLocalDate());
    retry.setInsertionDate(date);
    Assertions.assertEquals(date, retry.getInsertionDate());
    Assertions.assertEquals(date.toLocalDate(), retry.getDueDate());
    Assertions.assertEquals(0, retry.getAmount());
    Assertions.assertEquals("1", retry.getId());
    Assertions.assertEquals("abc", retry.getNoticeNumber());
    Assertions.assertEquals(true, retry.isPaid());
    Assertions.assertEquals("123", retry.getMessageId());
    Assertions.assertEquals("ABC", retry.getPayeeFiscalCode());
    Assertions.assertEquals("payments", retry.getSource());
    return retry;
  }

  protected PaymentRoot getPaymentRootObject() {
    PaymentRoot pr = new PaymentRoot();
    Creditor creditor = new Creditor();
    DebtorPosition debtorPosition = new DebtorPosition();
    Payer payer = new Payer();
    PaymentInfo info = new PaymentInfo();
    Psp psp = new Psp();
    creditor.setIdPA("test");
    creditor.setCompanyName("test");
    creditor.setIdBrokerPA("");
    creditor.setIdStation("");
    pr.setCreditor(creditor);
    Debtor debtor = new Debtor();
    debtor.setFullName("test");
    debtor.setEntityUniqueIdentifierType("");
    debtor.setEntityUniqueIdentifierValue("");
    pr.setDebtor(debtor);
    pr.setComplete("test");
    debtorPosition.setNoticeNumber("A1234");
    pr.setDebtorPosition(debtorPosition);
    pr.setMissingInfo(new ArrayList<>());
    pr.setIdPaymentManager("1234");
    psp.setIdChannel("1234");
    psp.setPsp("test");
    psp.setIdPsp("test");
    pr.setPsp(psp);
    pr.setUuid("123");
    pr.setVersion("");
    info.setAmount("123");
    info.setDueDate("9999/12/31");
    info.setFee("123");
    info.setTotalNotice("");
    info.setApplicationDate("");
    info.setPaymentDateTime("");
    info.setPaymentMethod("");
    info.setPaymentToken("");
    info.setTouchpoint("");
    info.setTransferDate("");
    pr.setPaymentInfo(info);
    payer.setFullName("test");
    payer.setEntityUniqueIdentifierValue("");
    payer.setEntityUniqueIdentifierType("");
    pr.setPayer(payer);
    Assertions.assertEquals("test", creditor.getIdPA());
    Assertions.assertEquals("test", creditor.getCompanyName());
    Assertions.assertEquals("", creditor.getIdBrokerPA());
    Assertions.assertEquals("", creditor.getIdStation());
    Assertions.assertEquals("test", debtor.getFullName());
    Assertions.assertEquals("", debtor.getEntityUniqueIdentifierType());
    Assertions.assertEquals("", debtor.getEntityUniqueIdentifierValue());
    Assertions.assertEquals("A1234", debtorPosition.getNoticeNumber());
    Assertions.assertEquals("test", pr.getComplete());
    Assertions.assertEquals("1234", pr.getIdPaymentManager());
    Assertions.assertEquals("test", pr.getComplete());
    Assertions.assertEquals("test", psp.getPsp());
    Assertions.assertEquals("1234", psp.getIdChannel());
    Assertions.assertEquals("test", psp.getIdPsp());
    Assertions.assertEquals("test", payer.getFullName());
    Assertions.assertEquals("123", info.getAmount());
    return pr;
  }

  protected String getPaymentRootString() {
    return getPaymentRootObject().toString();
  }

  protected PaymentRoot getPaymentRoot() {
    PaymentRoot root = new PaymentRoot();
    List<Transfer> transferList = new ArrayList<Transfer>();
    Transfer transfer = new Transfer();
    transfer.setAmount("");
    transfer.setCompanyName("");
    transfer.setFiscalCodePA("");
    transfer.setRemittanceInformation("");
    transfer.setTransferCategory("");
    transferList.add(transfer);
    DebtorPosition position = new DebtorPosition();
    position.setNoticeNumber("123");
    Creditor cred = new Creditor();
    cred.setIdPA("123");
    root.setDebtorPosition(position);
    root.setCreditor(cred);
    root.setTransferList(transferList);
    PaymentInfo info = new PaymentInfo();
    info.setPaymentDateTime(LocalDateTime.now().toString());
    root.setPaymentInfo(info);
    return root;
  }

  protected message selectMessageMockObject(String type) {
    message paymentMessage = null;
    switch (type) {
      case "EMPTY":
        paymentMessage = new message();
        paymentMessage.setId("ID");
        paymentMessage.setFiscalCode("A_FISCAL_CODE");
        paymentMessage.setSenderServiceId("ASenderServiceId");
        paymentMessage.setSenderUserId("ASenderUserId");
        paymentMessage.setContentType(MessageContentType.PAYMENT);
        paymentMessage.setContentSubject("ASubject");
      default:
        paymentMessage = new message();
        paymentMessage.setId("ID");
        paymentMessage.setFiscalCode("A_FISCAL_CODE");
        paymentMessage.setSenderServiceId("ASenderServiceId");
        paymentMessage.setSenderUserId("ASenderUserId");
        paymentMessage.setContentType(MessageContentType.PAYMENT);
        paymentMessage.setContentSubject("ASubject");
        paymentMessage.setContentPaymentDataNoticeNumber("test");
        paymentMessage.setContentPaymentDataPayeeFiscalCode("test");
    }
    ;
    return paymentMessage;
  }
}
