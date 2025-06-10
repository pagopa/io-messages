package it.ioapp.com.reminder.util;

import java.time.LocalDateTime;

public class DateUtils {
    public static LocalDateTime resetLocalDateTimeToSimpleDate(LocalDateTime dateTime) {
        return dateTime.withHour(0).withMinute(0).withSecond(0).withNano(0);
    }

}
