package it.ioapp.com.paymentupdater.dto.payments;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import javax.annotation.Generated;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
  "fiscalCodePA",
  "companyName",
  "amount",
  "transferCategory",
  "remittanceInformation"
})
@Generated("jsonschema2pojo")
public class Transfer {

  @JsonProperty("fiscalCodePA")
  private String fiscalCodePA;

  @JsonProperty("companyName")
  private String companyName;

  @JsonProperty("amount")
  private String amount;

  @JsonProperty("transferCategory")
  private String transferCategory;

  @JsonProperty("remittanceInformation")
  private String remittanceInformation;

  @JsonProperty("fiscalCodePA")
  public String getFiscalCodePA() {
    return fiscalCodePA;
  }

  @JsonProperty("fiscalCodePA")
  public void setFiscalCodePA(String fiscalCodePA) {
    this.fiscalCodePA = fiscalCodePA;
  }

  @JsonProperty("companyName")
  public String getCompanyName() {
    return companyName;
  }

  @JsonProperty("companyName")
  public void setCompanyName(String companyName) {
    this.companyName = companyName;
  }

  @JsonProperty("amount")
  public String getAmount() {
    return amount;
  }

  @JsonProperty("amount")
  public void setAmount(String amount) {
    this.amount = amount;
  }

  @JsonProperty("transferCategory")
  public String getTransferCategory() {
    return transferCategory;
  }

  @JsonProperty("transferCategory")
  public void setTransferCategory(String transferCategory) {
    this.transferCategory = transferCategory;
  }

  @JsonProperty("remittanceInformation")
  public String getRemittanceInformation() {
    return remittanceInformation;
  }

  @JsonProperty("remittanceInformation")
  public void setRemittanceInformation(String remittanceInformation) {
    this.remittanceInformation = remittanceInformation;
  }
}
