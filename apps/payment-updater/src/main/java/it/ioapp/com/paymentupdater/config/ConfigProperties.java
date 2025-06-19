package it.ioapp.com.paymentupdater.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Getter
@Component
public class ConfigProperties {

    @Value("${spring_cors_origin}")
    private String corsOrigin;

}
