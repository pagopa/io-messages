
package it.ioapp.com.paymentupdater.dto.payments;

import javax.annotation.Generated;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
    "idPA",
    "idBrokerPA",
    "idStation",
    "companyName"
})
@Generated("jsonschema2pojo")
public class Creditor {

    @JsonProperty("idPA")
    private String idPA;
    @JsonProperty("idBrokerPA")
    private String idBrokerPA;
    @JsonProperty("idStation")
    private String idStation;
    @JsonProperty("companyName")
    private String companyName;


    @JsonProperty("idPA")
    public String getIdPA() {
        return idPA;
    }

    @JsonProperty("idPA")
    public void setIdPA(String idPA) {
        this.idPA = idPA;
    }

    @JsonProperty("idBrokerPA")
    public String getIdBrokerPA() {
        return idBrokerPA;
    }

    @JsonProperty("idBrokerPA")
    public void setIdBrokerPA(String idBrokerPA) {
        this.idBrokerPA = idBrokerPA;
    }

    @JsonProperty("idStation")
    public String getIdStation() {
        return idStation;
    }

    @JsonProperty("idStation")
    public void setIdStation(String idStation) {
        this.idStation = idStation;
    }

    @JsonProperty("companyName")
    public String getCompanyName() {
        return companyName;
    }

    @JsonProperty("companyName")
    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

}
