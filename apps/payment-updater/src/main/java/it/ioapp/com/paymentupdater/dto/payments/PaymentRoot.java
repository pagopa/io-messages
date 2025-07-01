package it.ioapp.com.paymentupdater.dto.payments;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import java.util.List;
import javax.annotation.Generated;
import lombok.ToString;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
  "uuid",
  "version",
  "idPaymentManager",
  "complete",
  "missingInfo",
  "debtorPosition",
  "creditor",
  "psp",
  "debtor",
  "payer",
  "paymentInfo",
  "transferList"
})
@Generated("jsonschema2pojo")
@ToString
public class PaymentRoot {

  @JsonProperty("uuid")
  private String uuid;

  @JsonProperty("version")
  private String version;

  @JsonProperty("idPaymentManager")
  private String idPaymentManager;

  @JsonProperty("complete")
  private String complete;

  @JsonProperty("missingInfo")
  private List<String> missingInfo = null;

  @JsonProperty("debtorPosition")
  private DebtorPosition debtorPosition;

  @JsonProperty("creditor")
  private Creditor creditor;

  @JsonProperty("psp")
  private Psp psp;

  @JsonProperty("debtor")
  private Debtor debtor;

  @JsonProperty("payer")
  private Payer payer;

  @JsonProperty("paymentInfo")
  private PaymentInfo paymentInfo;

  @JsonProperty("transferList")
  private List<Transfer> transferList = null;

  @JsonProperty("uuid")
  public String getUuid() {
    return uuid;
  }

  @JsonProperty("uuid")
  public void setUuid(String uuid) {
    this.uuid = uuid;
  }

  @JsonProperty("version")
  public String getVersion() {
    return version;
  }

  @JsonProperty("version")
  public void setVersion(String version) {
    this.version = version;
  }

  @JsonProperty("idPaymentManager")
  public String getIdPaymentManager() {
    return idPaymentManager;
  }

  @JsonProperty("idPaymentManager")
  public void setIdPaymentManager(String idPaymentManager) {
    this.idPaymentManager = idPaymentManager;
  }

  @JsonProperty("complete")
  public String getComplete() {
    return complete;
  }

  @JsonProperty("complete")
  public void setComplete(String complete) {
    this.complete = complete;
  }

  @JsonProperty("missingInfo")
  public List<String> getMissingInfo() {
    return missingInfo;
  }

  @JsonProperty("missingInfo")
  public void setMissingInfo(List<String> missingInfo) {
    this.missingInfo = missingInfo;
  }

  @JsonProperty("debtorPosition")
  public DebtorPosition getDebtorPosition() {
    return debtorPosition;
  }

  @JsonProperty("debtorPosition")
  public void setDebtorPosition(DebtorPosition debtorPosition) {
    this.debtorPosition = debtorPosition;
  }

  @JsonProperty("creditor")
  public Creditor getCreditor() {
    return creditor;
  }

  @JsonProperty("creditor")
  public void setCreditor(Creditor creditor) {
    this.creditor = creditor;
  }

  @JsonProperty("psp")
  public Psp getPsp() {
    return psp;
  }

  @JsonProperty("psp")
  public void setPsp(Psp psp) {
    this.psp = psp;
  }

  @JsonProperty("debtor")
  public Debtor getDebtor() {
    return debtor;
  }

  @JsonProperty("debtor")
  public void setDebtor(Debtor debtor) {
    this.debtor = debtor;
  }

  @JsonProperty("payer")
  public Payer getPayer() {
    return payer;
  }

  @JsonProperty("payer")
  public void setPayer(Payer payer) {
    this.payer = payer;
  }

  @JsonProperty("paymentInfo")
  public PaymentInfo getPaymentInfo() {
    return paymentInfo;
  }

  @JsonProperty("paymentInfo")
  public void setPaymentInfo(PaymentInfo paymentInfo) {
    this.paymentInfo = paymentInfo;
  }

  @JsonProperty("transferList")
  public List<Transfer> getTransferList() {
    return transferList;
  }

  @JsonProperty("transferList")
  public void setTransferList(List<Transfer> transferList) {
    this.transferList = transferList;
  }
}
