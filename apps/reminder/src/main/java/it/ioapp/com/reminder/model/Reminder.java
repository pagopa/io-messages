package it.ioapp.com.reminder.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.mongodb.core.mapping.Document;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;

import it.ioapp.com.reminder.deserializer.CustomLocalDateArrayDeserializer;
import it.ioapp.com.reminder.util.Constants;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import javax.persistence.Table;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties
@Document("reminder-sharded-new")
@ToString(callSuper = true)
public class Reminder extends Message {

	private boolean readFlag;
	private boolean paidFlag;

	@JsonDeserialize(using = LocalDateTimeDeserializer.class)
	@JsonFormat(shape = JsonFormat.Shape.STRING, pattern = Constants.DATE_FORMAT_DESERIALIZER)
	private LocalDateTime insertionDate;

	@JsonDeserialize(using = CustomLocalDateArrayDeserializer.class)
	@JsonFormat(shape = JsonFormat.Shape.STRING, pattern = Constants.DATE_FORMAT_DESERIALIZER)
	private List<LocalDateTime> dateReminder = new ArrayList<>();

	@JsonDeserialize(using = LocalDateTimeDeserializer.class)
	@JsonFormat(shape = JsonFormat.Shape.STRING, pattern = Constants.DATE_FORMAT_DESERIALIZER)
	private LocalDateTime lastDateReminder;

	private int maxReadMessageSend;
	private int maxPaidMessageSend;

	@JsonDeserialize(using = LocalDateTimeDeserializer.class)
	@JsonFormat(shape = JsonFormat.Shape.STRING, pattern = Constants.DATE_FORMAT_DESERIALIZER)
	private LocalDateTime readDate;

	@JsonDeserialize(using = LocalDateTimeDeserializer.class)
	@JsonFormat(shape = JsonFormat.Shape.STRING, pattern = Constants.DATE_FORMAT_DESERIALIZER)
	private LocalDateTime paidDate;

	private String rptId;

}
