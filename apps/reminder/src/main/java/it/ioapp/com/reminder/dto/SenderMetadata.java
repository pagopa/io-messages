package it.ioapp.com.reminder.dto;

import org.springframework.beans.factory.annotation.Value;

import lombok.NoArgsConstructor;

//@Getter
//@Setter
@NoArgsConstructor
public class SenderMetadata {

	@Value("${notification.senderMetadata.serviceName}")
	private String serviceName;
	@Value("${notification.senderMetadata.organizationName}")
	private String organizationName;
	@Value("${notification.senderMetadata.departmentName}")
	private String departmentName;
}
