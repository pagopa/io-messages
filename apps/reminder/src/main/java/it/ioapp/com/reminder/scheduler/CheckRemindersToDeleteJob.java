package it.ioapp.com.reminder.scheduler;

import java.time.Duration;
import java.time.Instant;

import javax.transaction.Transactional;

import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import it.ioapp.com.reminder.service.ReminderService;
import lombok.extern.slf4j.Slf4j;
@Component
@Slf4j
public class CheckRemindersToDeleteJob  implements Job {

	private static final String JOB_LOG_NAME = "Reminders to DELETE Job ";

	private final ReminderService reminderService;

	@Autowired
	public CheckRemindersToDeleteJob(ReminderService reminderService) {
		this.reminderService = reminderService;
	}

	@Transactional(Transactional.TxType.NOT_SUPPORTED)
	public void execute(JobExecutionContext context) {
		log.info(JOB_LOG_NAME + "started");
		Instant start = Instant.now();
		reminderService.deleteMessage();
		Instant end = Instant.now();
		log.info(JOB_LOG_NAME + "ended in " + Duration.between(start, end).getSeconds() + " seconds");
	}

}
