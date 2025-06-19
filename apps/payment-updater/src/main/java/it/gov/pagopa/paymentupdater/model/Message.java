package it.gov.pagopa.paymentupdater.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;

import dto.FeatureLevelType;
import dto.MessageContentType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter 
@Setter 
@NoArgsConstructor 
public class Message {

	@Id
	protected String id;
	protected String senderServiceId;
	protected String senderUserId="undefined";
	protected int timeToLiveSeconds;
	private LocalDateTime dueDate;
	protected long createdAt;
	protected boolean isPending = true;
	protected String content_subject;
	protected MessageContentType content_type;
	protected double content_paymentData_amount;
	protected String content_paymentData_noticeNumber;
	protected boolean content_paymentData_invalidAfterDueDate;
	protected String content_paymentData_payeeFiscalCode;
	protected String fiscalCode;
	protected FeatureLevelType feature_level_type;
	
}
