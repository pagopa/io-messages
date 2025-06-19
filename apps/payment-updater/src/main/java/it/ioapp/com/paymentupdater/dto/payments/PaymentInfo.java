
package it.ioapp.com.paymentupdater.dto.payments;

import javax.annotation.Generated;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
    "paymentDateTime",
    "applicationDate",
    "transferDate",
    "dueDate",
    "paymentToken",
    "amount",
    "fee",
    "totalNotice",
    "paymentMethod",
    "touchpoint",
    "remittanceInformation"
})
@Generated("jsonschema2pojo")
public class PaymentInfo {

    @JsonProperty("paymentDateTime")
    private String paymentDateTime;
    @JsonProperty("applicationDate")
    private String applicationDate;
    @JsonProperty("transferDate")
    private String transferDate;
    @JsonProperty("dueDate")
    private String dueDate;
    @JsonProperty("paymentToken")
    private String paymentToken;
    @JsonProperty("amount")
    private String amount;
    @JsonProperty("fee")
    private String fee;
    @JsonProperty("totalNotice")
    private String totalNotice;
    @JsonProperty("paymentMethod")
    private String paymentMethod;
    @JsonProperty("touchpoint")
    private String touchpoint;
    @JsonProperty("remittanceInformation")
    private String remittanceInformation;

    @JsonProperty("paymentDateTime")
    public String getPaymentDateTime() {
        return paymentDateTime;
    }

    @JsonProperty("paymentDateTime")
    public void setPaymentDateTime(String paymentDateTime) {
        this.paymentDateTime = paymentDateTime;
    }

    @JsonProperty("applicationDate")
    public String getApplicationDate() {
        return applicationDate;
    }

    @JsonProperty("applicationDate")
    public void setApplicationDate(String applicationDate) {
        this.applicationDate = applicationDate;
    }

    @JsonProperty("transferDate")
    public String getTransferDate() {
        return transferDate;
    }

    @JsonProperty("transferDate")
    public void setTransferDate(String transferDate) {
        this.transferDate = transferDate;
    }

    @JsonProperty("dueDate")
    public String getDueDate() {
        return dueDate;
    }

    @JsonProperty("dueDate")
    public void setDueDate(String dueDate) {
        this.dueDate = dueDate;
    }

    @JsonProperty("paymentToken")
    public String getPaymentToken() {
        return paymentToken;
    }

    @JsonProperty("paymentToken")
    public void setPaymentToken(String paymentToken) {
        this.paymentToken = paymentToken;
    }

    @JsonProperty("amount")
    public String getAmount() {
        return amount;
    }

    @JsonProperty("amount")
    public void setAmount(String amount) {
        this.amount = amount;
    }

    @JsonProperty("fee")
    public String getFee() {
        return fee;
    }

    @JsonProperty("fee")
    public void setFee(String fee) {
        this.fee = fee;
    }

    @JsonProperty("totalNotice")
    public String getTotalNotice() {
        return totalNotice;
    }

    @JsonProperty("totalNotice")
    public void setTotalNotice(String totalNotice) {
        this.totalNotice = totalNotice;
    }

    @JsonProperty("paymentMethod")
    public String getPaymentMethod() {
        return paymentMethod;
    }

    @JsonProperty("paymentMethod")
    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    @JsonProperty("touchpoint")
    public String getTouchpoint() {
        return touchpoint;
    }

    @JsonProperty("touchpoint")
    public void setTouchpoint(String touchpoint) {
        this.touchpoint = touchpoint;
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
