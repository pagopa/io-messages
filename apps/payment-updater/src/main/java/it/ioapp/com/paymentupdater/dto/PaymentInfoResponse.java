package it.ioapp.com.paymentupdater.dto;

import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PaymentInfoResponse {

  private boolean isPaid;
  private LocalDate dueDate;
}
