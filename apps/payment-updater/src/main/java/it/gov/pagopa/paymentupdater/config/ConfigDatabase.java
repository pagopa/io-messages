package it.gov.pagopa.paymentupdater.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
public class ConfigDatabase {
	
	@Bean("collectionName")
	public String mongoCollectionName(@Value("${mongo.collection.name}") final String collectionName) {
	    return collectionName;
	}
	
	@Bean("collectionRetry")
	public String mongoCollectionRetry(@Value("${mongo.collection.retry.name}") final String collectionName) {
	    return collectionName;
	}

}
