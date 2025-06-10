package it.ioapp.com.reminder.util;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.TimeZone;

import dto.message;
import it.ioapp.com.reminder.model.Reminder;

public class ReminderMapper {

    public static Reminder messageToReminder(message msg) {
        Reminder reminder = new Reminder();
        reminder.setId(msg.getId());

        if (msg.getDueDate() != 0L) {
            LocalDate reminderDueDate = LocalDateTime.ofInstant(Instant.ofEpochMilli(msg.getDueDate()),
                    TimeZone.getDefault().toZoneId()).toLocalDate();
            reminder.setDueDate(ReminderUtil.getLocalDateTime(reminderDueDate));
        }
        reminder.setFiscalCode(msg.getFiscalCode());
        reminder.setFeature_level_type(msg.getFeatureLevelType());
        reminder.setContent_type(msg.getContentType());
        reminder.setContent_subject(msg.getContentSubject());
        reminder.setCreatedAt(msg.getCreatedAt());
        reminder.setContent_paymentData_amount(msg.getContentPaymentDataAmount());
        reminder.setContent_paymentData_invalidAfterDueDate(msg.getContentPaymentDataInvalidAfterDueDate());
        reminder.setContent_paymentData_noticeNumber(msg.getContentPaymentDataNoticeNumber());
        reminder.setContent_paymentData_payeeFiscalCode(msg.getContentPaymentDataPayeeFiscalCode());
        reminder.setSenderServiceId(msg.getSenderServiceId());
        reminder.setSenderUserId(msg.getSenderUserId());
        reminder.setTimeToLiveSeconds(msg.getTimeToLiveSeconds());
        reminder.setPending(msg.getIsPending());
        return reminder;
    }
}
