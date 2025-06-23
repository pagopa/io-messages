package it.ioapp.com.paymentupdater.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties
@Document(collection = "#{@collectionRetry}")
public class PaymentRetry {

  @Id String id;
  String messageId;
  String noticeNumber;
  String payeeFiscalCode;
  boolean paid;
  LocalDateTime insertionDate;
  double amount;
  String source;
  LocalDate dueDate;
}
