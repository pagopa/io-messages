package it.gov.pagopa.paymentupdater.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProxyPaymentResponse {

  private String type;
  private String title;
  private int status;
  private String detail;
  private String detailV2;
  private String instance;

}
