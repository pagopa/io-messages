package it.ioapp.com.reminder.scheduler;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.TimeZone;
import org.quartz.CronScheduleBuilder;
import org.quartz.Job;
import org.quartz.JobBuilder;
import org.quartz.JobDetail;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.Trigger;
import org.quartz.TriggerBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

@Service
public class JobScheduler {

  private static final String REMINDERS_JOB_GROUP = "reminders";
  private final Scheduler scheduler;
  // private static final List<String> SHARDS = IntStream.range(0,
  // 16).mapToObj(Integer::toHexString).toList();
  private static final List<String> SHARDS =
      new ArrayList<String>(
          Arrays.asList(
              "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"));

  @Value("${scheduler.reminderstonotify.cron-expression}")
  private String cronExpressionNotify;

  @Value("${scheduler.reminderstodelete.cron-expression}")
  private String cronExpressionDelete;

  @Value("${scheduler.reminderstonotify.active}")
  private boolean isActiveNotifyJob;

  @Value("${scheduler.reminderstodelete.active}")
  private boolean isActiveDeleteJob;

  public JobScheduler(Scheduler scheduler) {
    this.scheduler = scheduler;
  }

  public void startRemindersJob() throws SchedulerException {
    if (isActiveNotifyJob) scheduleCheckRemindersToNotifyJob();
    if (isActiveDeleteJob) scheduleCheckRemindersToDeleteJob();
  }

  public void scheduleCheckRemindersToNotifyJob() throws SchedulerException {
    for (String shard : SHARDS) {
      JobKey jobKey = JobKey.jobKey("check-reminders-notifications-" + shard, REMINDERS_JOB_GROUP);
      scheduleJob(jobKey, cronExpressionNotify, CheckRemindersToNotifyJob.class, shard);
    }
  }

  public void scheduleCheckRemindersToDeleteJob() throws SchedulerException {
    JobKey jobKey = JobKey.jobKey("check-reminders-delete", REMINDERS_JOB_GROUP);
    scheduleJob(jobKey, cronExpressionDelete, CheckRemindersToDeleteJob.class, null);
  }

  private void scheduleJob(
      JobKey jobKey, String cronExpression, Class<? extends Job> jobClass, @Nullable String shard)
      throws SchedulerException {
    for (Trigger trigger : scheduler.getTriggersOfJob(jobKey)) {
      scheduler.unscheduleJob(trigger.getKey());
    }

    JobDetail job = JobBuilder.newJob(jobClass).withIdentity(jobKey).build();

    Trigger trigger =
        TriggerBuilder.newTrigger()
            .usingJobData("shard", shard)
            .withSchedule(
                CronScheduleBuilder.cronSchedule(cronExpression)
                    .inTimeZone(TimeZone.getTimeZone("Europe/Rome")))
            .build();

    scheduler.scheduleJob(job, trigger);
  }
}
