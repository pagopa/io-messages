package it.ioapp.com.paymentupdater.util;

import com.microsoft.applicationinsights.TelemetryClient;
import java.util.Map;

public class TelemetryCustomEvent {

  private TelemetryCustomEvent() {}

  private static TelemetryClient telemetry = new TelemetryClient();

  /**
   * Method for adding a custom event in Azure Application Insights
   *
   * @param eventName
   * @param metrics
   * @param properties
   */
  public static void writeTelemetry(
      String eventName, Map<String, Double> metrics, Map<String, String> properties) {
    // Send the event
    telemetry.trackEvent(eventName, properties, metrics);
  }
}
