package it.ioapp.com.paymentupdater.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class PaymentMessage {

  String messageId;
  String noticeNumber;
  String payeeFiscalCode;
  boolean paid;
  LocalDateTime dueDate;
  double amount;
  String source;
  String fiscalCode;
  LocalDateTime paymentDateTime;
}
