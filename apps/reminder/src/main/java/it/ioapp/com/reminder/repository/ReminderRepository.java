package it.ioapp.com.reminder.repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import it.ioapp.com.reminder.model.Reminder;

@Repository
public interface ReminderRepository extends MongoRepository<Reminder, String> {

	@Query("{'content_paymentData_noticeNumber':?0, 'content_paymentData_payeeFiscalCode':?1}")
	List<Reminder> getPaymentByNoticeNumberAndFiscalCode(String noticeNumber, String fiscalCode);

	@Query(value = "{content_type:{'$ne':?1}, $or:[{readFlag:true}, {maxReadMessageSend:{$gte:?0}}]}", delete = true)
	int deleteReadMessage(int maxReadMessageSend, String typeMessage);

	@Query(value = "{content_type:?1, $or:[{paidFlag:true}, {maxPaidMessageSend:{$gte:?0}}, {$and:[{dueDate:{$exists: true}}, {dueDate:{$lt:?2}}]}]}", delete = true)
	int deletePaidMessage(int maxPaidMessageSend, String typeMessage, LocalDate today);

	/**
	 * Retrieval of unread, unpaid reminders that have not exceeded the maximum
	 * number of notifications.
	 *
	 * @param maxReadMessageSend
	 * @return Reminder list
	 */
	@Query("{readFlag:false, paidFlag:false, shard:?0, content_type:{'$ne':?1}, maxReadMessageSend:{$lt:?2}, $or:[{$and:[{lastDateReminder:{$exists: false}},{insertionDate:{$lt:?3}}]}, {lastDateReminder:{$lt:?3}}]}")
	Page<Reminder> getReadMessageToNotify(String shard, String typeMessage, int maxReadMessageSend,
			LocalDateTime dateTimeRead,
			Pageable pageable);

	/**
	 * Recovery of payment reminders, read, unpaid and that have not passed
	 * the maximum number of notifications with expiration in the predetermined
	 * range.
	 *
	 * @param typeMessage
	 * @param maxPaidMessageSend
	 * @param dateTimePayment
	 * @param startDateReminder
	 * @return Reminder list
	 */
	@Query("{paidFlag:false, shard:?0, content_type:?1, maxPaidMessageSend:{$lt:?2}, dueDate:{$lt: ?4, $gt: ?5}, $or:[{$and:[{lastDateReminder:{$exists: false}},{insertionDate:{$lt:?3}}]}, {lastDateReminder:{$lt:?3}}, {dueDate:{$exists: false}}]}")
	Page<Reminder> getPaidMessageToNotify(String shard,
										  String typeMessage,
										  Integer maxPaidMessageSend,
										  LocalDateTime dateTimePayment,
										  LocalDate startDateReminder,
										  LocalDate todayTime,
										  Pageable pageable);

	@Query("{shard:?0, rptId:?1}")
	List<Reminder> getPaymentByRptId(String shard, String rptId);

	int countByShardAndId(String shard, String id);

}
