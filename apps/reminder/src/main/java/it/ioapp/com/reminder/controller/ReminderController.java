package it.ioapp.com.reminder.controller;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import io.swagger.annotations.Api;
import it.ioapp.com.reminder.service.ReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@Api(tags = "API  Reminder")
@RestController
@Validated
@RequestMapping(
    value = "/",
    produces = APPLICATION_JSON_VALUE,
    consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.ALL_VALUE},
    method = RequestMethod.OPTIONS)
@RequiredArgsConstructor
public class ReminderController {

  @Autowired ReminderService reminderService;

  @GetMapping("health")
  public ResponseEntity<String> getHealtCheck() {
    return ResponseEntity.ok().body(reminderService.healthCheck());
  }
}
