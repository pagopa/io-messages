package it.ioapp.com.paymentupdater.dto.payments;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import javax.annotation.Generated;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({"idPsp", "idBrokerPsp", "idChannel", "psp"})
@Generated("jsonschema2pojo")
public class Psp {

  @JsonProperty("idPsp")
  private String idPsp;

  @JsonProperty("idBrokerPsp")
  private String idBrokerPsp;

  @JsonProperty("idChannel")
  private String idChannel;

  @JsonProperty("psp")
  private String psp;

  @JsonProperty("idPsp")
  public String getIdPsp() {
    return idPsp;
  }

  @JsonProperty("idPsp")
  public void setIdPsp(String idPsp) {
    this.idPsp = idPsp;
  }

  @JsonProperty("idBrokerPsp")
  public String getIdBrokerPsp() {
    return idBrokerPsp;
  }

  @JsonProperty("idBrokerPsp")
  public void setIdBrokerPsp(String idBrokerPsp) {
    this.idBrokerPsp = idBrokerPsp;
  }

  @JsonProperty("idChannel")
  public String getIdChannel() {
    return idChannel;
  }

  @JsonProperty("idChannel")
  public void setIdChannel(String idChannel) {
    this.idChannel = idChannel;
  }

  @JsonProperty("psp")
  public String getPsp() {
    return psp;
  }

  @JsonProperty("psp")
  public void setPsp(String psp) {
    this.psp = psp;
  }
}
