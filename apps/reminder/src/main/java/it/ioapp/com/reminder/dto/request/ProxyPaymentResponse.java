package it.ioapp.com.reminder.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ProxyPaymentResponse {

	private String importoSingoloVersamento;
	private String codiceContestoPagamento;
	private String type;
	private String title;
	private int status;
	private String detail;
	private String detail_v2;
	private String instance;
	private String duedate;

}
