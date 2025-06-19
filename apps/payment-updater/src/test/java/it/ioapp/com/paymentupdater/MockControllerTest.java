package it.ioapp.com.paymentupdater;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;

import it.ioapp.com.paymentupdater.model.ApiPaymentMessage;
import it.ioapp.com.paymentupdater.model.Payment;
import it.ioapp.com.paymentupdater.producer.PaymentProducer;

@SpringBootTest(classes = Application.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@RunWith(SpringRunner.class)
@AutoConfigureMockMvc
public class MockControllerTest extends AbstractMock {
	@Autowired
	private MockMvc mvc;

	@Autowired
	ObjectMapper mapper;

	@Mock
	private PaymentProducer producer;

	/*
	@Test
	public void callGetMessagePayment() throws Exception {
		Payment payment = selectReminderMockObject("", "1", "PAYMENT", "AAABBB77Y66A444A", 3,
				"ALSDKdcoekroicjre200", "ALSDKdcoek", "roicjre200");
		mockFindIdWithResponse(payment);

		MockHttpServletResponse response = mvc
				.perform(get("/api/v1/payment/check/messages/ABC").accept(MediaType.APPLICATION_JSON)).andReturn()
				.getResponse();

		ApiPaymentMessage resp = mapper.readValue(response.getContentAsString(), ApiPaymentMessage.class);
		assertThat(resp).isNotNull();
		assertThat(resp.getFiscalCode()).isNotBlank();
		assertThat(resp.getNoticeNumber()).isNotBlank();
		assertThat(response.getStatus()).isEqualTo(HttpStatus.OK.value());
	}
  */

	@Test
	public void callGetMessagePayment404() throws Exception {
		mockFindIdWithResponse404();

		MockHttpServletResponse response = mvc
				.perform(get("/api/v1/payment/check/messages/ABC").accept(MediaType.APPLICATION_JSON)).andReturn()
				.getResponse();

		assertThat(response.getStatus()).isEqualTo(HttpStatus.NOT_FOUND.value());
	}

	@Test
	public void callCheckReady() throws Exception {
		// when
		MockHttpServletResponse response = mvc
				.perform(get("/api/v1/health/ready").accept(MediaType.APPLICATION_JSON)).andReturn()
				.getResponse();
		// then
		assertThat(response.getStatus()).isEqualTo(HttpStatus.OK.value());
	}

	@Test
	public void callCheckLive() throws Exception {
		// when
		MockHttpServletResponse response = mvc
				.perform(get("/api/v1/health/live").accept(MediaType.APPLICATION_JSON)).andReturn()
				.getResponse();
		// then
		assertThat(response.getStatus()).isEqualTo(HttpStatus.OK.value());
	}
}
