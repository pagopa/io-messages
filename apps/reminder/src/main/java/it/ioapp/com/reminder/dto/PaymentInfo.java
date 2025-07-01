package it.ioapp.com.reminder.dto;

import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PaymentInfo {

  private boolean isPaid;
  private LocalDate dueDate;
}
