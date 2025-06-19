
package it.ioapp.com.paymentupdater.dto.payments;

import javax.annotation.Generated;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
    "fullName",
    "entityUniqueIdentifierType",
    "entityUniqueIdentifierValue"
})
@Generated("jsonschema2pojo")
public class Payer {

    @JsonProperty("fullName")
    private String fullName;
    @JsonProperty("entityUniqueIdentifierType")
    private String entityUniqueIdentifierType;
    @JsonProperty("entityUniqueIdentifierValue")
    private String entityUniqueIdentifierValue;

    @JsonProperty("fullName")
    public String getFullName() {
        return fullName;
    }

    @JsonProperty("fullName")
    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    @JsonProperty("entityUniqueIdentifierType")
    public String getEntityUniqueIdentifierType() {
        return entityUniqueIdentifierType;
    }

    @JsonProperty("entityUniqueIdentifierType")
    public void setEntityUniqueIdentifierType(String entityUniqueIdentifierType) {
        this.entityUniqueIdentifierType = entityUniqueIdentifierType;
    }

    @JsonProperty("entityUniqueIdentifierValue")
    public String getEntityUniqueIdentifierValue() {
        return entityUniqueIdentifierValue;
    }

    @JsonProperty("entityUniqueIdentifierValue")
    public void setEntityUniqueIdentifierValue(String entityUniqueIdentifierValue) {
        this.entityUniqueIdentifierValue = entityUniqueIdentifierValue;
    }

}
