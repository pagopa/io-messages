package it.gov.pagopa.paymentupdater.exception;

import org.springframework.kafka.KafkaException;

import lombok.Getter;

public class AvroDeserializerException extends KafkaException {

    @Getter
    private byte[] data;

    public AvroDeserializerException(String message, byte[] data) {
        super(message);
        this.data = data;
    }

}
