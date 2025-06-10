package it.ioapp.com.reminder.deserializer;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonMappingException;

import it.ioapp.com.reminder.util.Constants;

public class CustomLocalDateArrayDeserializer extends JsonDeserializer<List<LocalDateTime>> {

	private DateTimeFormatter formatter = DateTimeFormatter.ofPattern(Constants.DATE_FORMAT_DESERIALIZER);

	@Override
	public List<LocalDateTime> deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {

		ArrayList<LocalDateTime> list = new ArrayList<>();
		JsonToken currentToken = p.getCurrentToken();
		if (currentToken != JsonToken.START_ARRAY) {
			throw new JsonMappingException(p, "Not an array!");
		}

		currentToken = p.nextToken();

		while (currentToken != JsonToken.END_ARRAY) {
			if (currentToken != JsonToken.VALUE_STRING) {
				throw new JsonMappingException(p, "Not a string element!");
			}

			LocalDateTime localDate = LocalDateTime.parse(p.getValueAsString(), formatter);
			list.add(localDate);

			currentToken = p.nextToken();
		}

		return list;
	}
}
