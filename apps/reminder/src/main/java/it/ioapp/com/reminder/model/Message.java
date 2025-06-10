package it.ioapp.com.reminder.model;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import it.ioapp.com.reminder.util.Constants;

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
	protected String senderUserId;
	protected int timeToLiveSeconds;
	protected long createdAt;
	protected boolean isPending = true;
	protected String content_subject = "undefined";
	protected MessageContentType content_type;
	protected double content_paymentData_amount;
	protected String content_paymentData_noticeNumber;
	protected boolean content_paymentData_invalidAfterDueDate;
	protected String content_paymentData_payeeFiscalCode;
	protected String fiscalCode;
	protected String shard = "0";

	@JsonDeserialize(using = LocalDateTimeDeserializer.class)
	@JsonFormat(shape = JsonFormat.Shape.STRING, pattern = Constants.DATE_FORMAT_DESERIALIZER)
	protected LocalDateTime dueDate;

	protected FeatureLevelType feature_level_type;
}
