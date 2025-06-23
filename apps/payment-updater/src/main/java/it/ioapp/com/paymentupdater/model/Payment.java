package it.ioapp.com.paymentupdater.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties
@Document(collection = "#{@collectionName}")
@ToString
public class Payment extends Message {

  private boolean readFlag;
  private boolean paidFlag;
  @CreatedDate private LocalDateTime insertionDate;
  private List<LocalDateTime> dateReminder;
  private LocalDateTime lastDateReminder;
  private int maxReadMessageSend;
  private int maxPaidMessageSend;
  private LocalDateTime readDate;
  private LocalDateTime paidDate;
  private String rptId;
}
