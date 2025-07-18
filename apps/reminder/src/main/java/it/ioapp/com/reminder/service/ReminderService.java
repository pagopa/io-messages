package it.ioapp.com.reminder.service;

import it.ioapp.com.reminder.model.Reminder;
import java.util.List;
import java.util.Optional;

public interface ReminderService {

  Optional<Reminder> findById(String id);

  void save(Reminder reminder);

  void updateReminder(String reminderId);

  String healthCheck();

  void getMessageToNotify(String shard);

  void deleteMessage();

  List<Reminder> getPaymentsByRptid(String rptId);

  int countById(String shard, String id);

  void sendReminderNotification(Reminder reminder);

  void updateCounter(Reminder reminder);
}
