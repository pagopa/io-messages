package it.gov.pagopa.paymentupdater.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import org.apache.commons.lang3.StringUtils;


import it.gov.pagopa.paymentupdater.dto.PaymentMessage;
import it.gov.pagopa.paymentupdater.model.Payment;

public class PaymentUtil {

	private PaymentUtil() {}

	private static final String UNDEFINED = "undefined";


	public static void checkNullInMessage(Payment reminder) {
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


	public static void checkDueDateForPayment(LocalDate proxyDueDate, Payment reminder) {
		
		LocalDate reminderDueDate = reminder.getDueDate() != null ? reminder.getDueDate().toLocalDate() : null;

		if (proxyDueDate == null || !proxyDueDate.equals(reminderDueDate)) {
			reminder.setDueDate(getLocalDateTime(proxyDueDate));
		}

	}
	
	public static void checkDueDateForPaymentMessage(String proxyDueDate, PaymentMessage message) {

		if(StringUtils.isNotEmpty(proxyDueDate)) {
			LocalDate localDateProxyDueDate = LocalDate.parse(proxyDueDate);

			LocalDate reminderDueDate = message.getDueDate() != null ? message.getDueDate().toLocalDate() : null;

			if(!localDateProxyDueDate.equals(reminderDueDate)) {
				message.setDueDate(getLocalDateTime(localDateProxyDueDate));
			}
		} 
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
	
	public static LocalDateTime getCurrentTimeZone(LocalDateTime time, ZoneId oldZone, ZoneId newZone) {
		return Optional.ofNullable(time).map(currTime -> currTime.atZone(oldZone)
				.withZoneSameInstant(newZone)
				.toLocalDateTime()).orElse(null);
	}


}
