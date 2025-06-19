
package it.gov.pagopa.paymentupdater.dto.payments;
import javax.annotation.Generated;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
    "modelType",
    "noticeNumber",
    "iuv"
})
@Generated("jsonschema2pojo")
public class DebtorPosition {

    @JsonProperty("modelType")
    private String modelType;
    @JsonProperty("noticeNumber")
    private String noticeNumber;
    @JsonProperty("iuv")
    private String iuv;

    @JsonProperty("modelType")
    public String getModelType() {
        return modelType;
    }

    @JsonProperty("modelType")
    public void setModelType(String modelType) {
        this.modelType = modelType;
    }

    @JsonProperty("noticeNumber")
    public String getNoticeNumber() {
        return noticeNumber;
    }

    @JsonProperty("noticeNumber")
    public void setNoticeNumber(String noticeNumber) {
        this.noticeNumber = noticeNumber;
    }

    @JsonProperty("iuv")
    public String getIuv() {
        return iuv;
    }

    @JsonProperty("iuv")
    public void setIuv(String iuv) {
        this.iuv = iuv;
    }


}
