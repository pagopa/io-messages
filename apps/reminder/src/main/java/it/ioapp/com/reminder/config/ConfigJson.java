package it.ioapp.com.reminder.config;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;

import it.ioapp.com.reminder.model.JsonLoader;

@Configuration
public class ConfigJson {

	@Value("classpath:avro/message.json")
	private Resource messageSchema;

	@Value("classpath:data/messageStatusSchema.json")
	private Resource messageStatusSchema;

	@Bean(name = "messageSchema")
	public JsonLoader getMessageSchema() throws IOException {
		return new JsonLoader(messageSchema);
	}

	@Bean(name = "messageStatusSchema")
	public JsonLoader getMessageStatusSchema() throws IOException {
		return new JsonLoader(messageStatusSchema);
	}

	@Bean
	public ObjectMapper getObjectMapper() {
		ObjectMapper mapper = new ObjectMapper();
		mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
		mapper.registerModule(new ParameterNamesModule());
		mapper.registerModule(new Jdk8Module());
		mapper.registerModule(new JavaTimeModule());
		return mapper;
	}

	@Bean
	public RestTemplate restTemplate(RestTemplateBuilder builder) {
		return builder.build();
	}

}
