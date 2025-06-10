package it.ioapp.com.reminder.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import lombok.Getter;

@Getter
@Component
public class ConfigProperties {

    @Value("${spring_cors_origin}")
    private String corsOrigin;

}
