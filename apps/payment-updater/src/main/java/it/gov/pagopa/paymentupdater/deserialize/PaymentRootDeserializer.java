package it.gov.pagopa.paymentupdater.deserialize;

import java.util.Objects;
import org.apache.kafka.common.serialization.Deserializer;
import org.springframework.kafka.support.serializer.DeserializationException;

import com.fasterxml.jackson.databind.ObjectMapper;

import it.gov.pagopa.paymentupdater.dto.payments.PaymentRoot;
import it.gov.pagopa.paymentupdater.exception.SkipDataException;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class PaymentRootDeserializer implements Deserializer<PaymentRoot> {

	ObjectMapper mapper;

	public PaymentRootDeserializer(ObjectMapper mapper) {
		this.mapper = mapper;
	}

	@Override
    public PaymentRoot deserialize(String s, byte[] bytes) {
        PaymentRoot paymentRoot = null;
        try {
            paymentRoot = mapper.readValue(bytes, PaymentRoot.class);
        } catch (Exception e) {
            log.error("Error in deserializing the PaymentRoot for consumer payment-updates|ERROR=" + e.getMessage());
            throw new DeserializationException(
                    "Error in deserializing the PaymentRoot for consumer payment-updates|ERROR=" + e.getMessage(),
                    bytes, false, e);
        }

       if (Objects.isNull(paymentRoot) || Objects.isNull(paymentRoot.getDebtorPosition())
                || Objects.isNull(paymentRoot.getCreditor())) {
            throw new SkipDataException("Skip Data that not satisfies constraints", paymentRoot);
        }
        return paymentRoot;
    }


}
