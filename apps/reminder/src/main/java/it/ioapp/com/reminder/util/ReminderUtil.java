package it.ioapp.com.reminder.util;

import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

import org.apache.commons.lang3.StringUtils;

import it.ioapp.com.reminder.model.Reminder;

public class ReminderUtil {

	private ReminderUtil() {}

	private static final String UNDEFINED = "undefined";

	public static void checkNullInMessage(Reminder reminder) {
		if (Objects.nonNull(reminder)) {
			if (Objects.isNull(reminder.getInsertionDate())){
				reminder.setInsertionDate(LocalDateTime.now(ZonedDateTime.now().getZone()));
			}
			if (StringUtils.isEmpty(reminder.getSenderServiceId())){
				reminder.setSenderServiceId(UNDEFINED);
			}
			if (StringUtils.isEmpty(reminder.getSenderUserId())){
				reminder.setSenderUserId(UNDEFINED);
			}
			if (StringUtils.isEmpty(reminder.getContent_paymentData_payeeFiscalCode())){
				reminder.setContent_paymentData_payeeFiscalCode(UNDEFINED);
			}
			if (StringUtils.isEmpty(reminder.getContent_paymentData_noticeNumber())){
				reminder.setContent_paymentData_noticeNumber(UNDEFINED);
			}
		}
	}

	public static Map<String, String> getErrorMap(String message) {
		Map<String, String> properties = new HashMap<>();
		String creationTime = LocalDateTime.now().toString();
		properties.put(creationTime, message);
		return properties;
	}

	public static LocalDateTime getLocalDateTime(LocalDate date) {
		LocalDateTime localDateTime = null;
		if(date!=null) {
			localDateTime = LocalDateTime.of(date, LocalTime.of(12,0));
		}
		return localDateTime;
	}

	public static LocalDate getLocalDateFromString(String date) {
		LocalDate localDate = null;
		if (StringUtils.isNotEmpty(date)) {
			localDate = LocalDate.parse(date);
		}
		return localDate;
	}

	public static String calculateShard(String fiscalCode) {
		try {
			return ShaUtils.getHexString(fiscalCode).substring(0, 1);
		} catch (NoSuchAlgorithmException e) {
			return "0";
		}
	}


}
