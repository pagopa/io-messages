package it.ioapp.com.reminder.consumer;

import static it.ioapp.com.reminder.util.ReminderUtil.checkNullInMessage;
import static it.ioapp.com.reminder.util.ReminderUtil.calculateShard;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.concurrent.CountDownLatch;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import dto.FeatureLevelType;
import dto.MessageContentType;
import it.ioapp.com.reminder.model.Reminder;
import it.ioapp.com.reminder.service.ReminderService;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class MessageKafkaConsumer {

    @Autowired
    ReminderService reminderService;

    @Value("${senders.to.skip}")
    private String sendersToSkipDashedString;

    @Value("${senders.to.use}")
    private String sendersToUseDashedString;

    private CountDownLatch latch = new CountDownLatch(1);
    private String payload = null;

    @KafkaListener(topics = "${kafka.message}", groupId = "reminder-message", autoStartup = "${message.auto.start}")
    public void messageKafkaListener(Reminder message) {
        log.info("Received message: {}", message);
        checkNullInMessage(message);
        //boolean shouldSkipThisReminder = Arrays.stream(sendersToSkipDashedString.split("-")).anyMatch(value -> message.getSenderServiceId().equals(value));
        boolean shouldSaveThisMessage = Arrays.stream(sendersToUseDashedString.split("-")).anyMatch(value -> message.getSenderServiceId().equals(value));
        if (shouldSaveThisMessage && FeatureLevelType.ADVANCED.toString().equalsIgnoreCase(message.getFeature_level_type().toString())) {

            if (MessageContentType.PAYMENT.toString().equalsIgnoreCase(message.getContent_type().toString())) {
                message.setRptId(message.getContent_paymentData_payeeFiscalCode()
                        .concat(message.getContent_paymentData_noticeNumber()));
            }

            String shard = calculateShard(message.getFiscalCode());
            if (reminderService.countById(shard, message.getId()) == 0) {
                message.setShard(shard);
                reminderService.save(message);
            }
        }

        payload = message.toString();
        latch.countDown();
    }

    public CountDownLatch getLatch() {
        return latch;
    }

    public String getPayload() {
        return payload;
    }
}
