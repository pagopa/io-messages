package it.ioapp.com.paymentupdater.exception;

import org.springframework.kafka.KafkaException;

import lombok.Getter;

public class SkipDataException extends KafkaException {

    @Getter
    private Object skippedData;

    public SkipDataException(String message, Object skippedData) {
        super(message);
        this.skippedData = skippedData;
    }

}
