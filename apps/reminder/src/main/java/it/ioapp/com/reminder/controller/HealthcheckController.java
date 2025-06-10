package it.ioapp.com.reminder.controller;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.annotations.Api;
import it.ioapp.com.reminder.service.ReminderService;

@Api(tags = "API  HealthCheck")
@RestController
@Validated
@RequestMapping(value = "api/v1/health", produces = APPLICATION_JSON_VALUE, consumes = {
        MediaType.APPLICATION_JSON_VALUE, MediaType.ALL_VALUE }, method = RequestMethod.OPTIONS)
public class HealthcheckController {
    @Autowired
    ReminderService reminderService;

    @GetMapping(value = "/ready")
    public ResponseEntity<Object> checkReady() {
        return ResponseEntity.ok().body(reminderService.healthCheck());
    }

    @GetMapping(value = "/live")
    public ResponseEntity<Object> checkLive() {
        return new ResponseEntity<>(HttpStatus.OK);
    }

}
