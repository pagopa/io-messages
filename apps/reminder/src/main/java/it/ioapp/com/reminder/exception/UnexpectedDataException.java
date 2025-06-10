package it.ioapp.com.reminder.exception;

public class UnexpectedDataException extends SkipDataException {

    public UnexpectedDataException(String message, Object skippedData) {
        super(message, skippedData);
    }

}
