package it.gov.pagopa.paymentupdater.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
@Getter 
@Setter 
@NoArgsConstructor
@JsonIgnoreProperties
@Document(collection = "#{@collectionRetry}")
public class PaymentRetry {

	@Id
	String id;
	String messageId;
	String noticeNumber;
	String payeeFiscalCode;
	boolean paid;
	LocalDateTime insertionDate;
	double amount;
	String source;
	LocalDate dueDate;

}
