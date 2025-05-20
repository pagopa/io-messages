resource "azurerm_monitor_action_group" "io_com_error" {
  name                = "io-p-com-error-ag-01"
  resource_group_name = var.resource_group_name
  short_name          = "iocom-error"

  email_receiver {
    name                    = "slack"
    email_address           = var.io_com_slack_email
    use_common_alert_schema = true
  }
}

resource "azurerm_monitor_scheduled_query_rules_alert" "message-ingestion-alert" {
  name                = format("[%s-%s] Message Ingestion Error", var.project, var.domain)
  resource_group_name = var.resource_group_name
  location            = var.location

  data_source_id          = var.appi_id
  description             = "[IO-COM] Alerts for all the errors during the message ingestion to data lake"
  enabled                 = true
  auto_mitigation_enabled = false

  query = <<-QUERY
customEvents
| where name startswith "io.com.message.ingestion"
| summarize AggregatedValue = count() by bin(timestamp, 30m)
| where AggregatedValue >= 1
  QUERY

  severity    = 1
  frequency   = 10
  time_window = 10

  trigger {
    operator  = "GreaterThanOrEqual"
    threshold = 1
  }

  action {
    action_group = [
      azurerm_monitor_action_group.io_com_error.id
    ]
  }
}

resource "azurerm_monitor_scheduled_query_rules_alert" "message-status-ingestion-alert" {
  name                = format("[%s-%s] Message Status Ingestion Error", var.project, var.domain)
  resource_group_name = var.resource_group_name
  location            = var.location

  data_source_id          = var.appi_id
  description             = "[IO-COM] Alerts for all the errors during the message status ingestion to data lake"
  enabled                 = true
  auto_mitigation_enabled = false

  query = <<-QUERY
customEvents
| where name startswith "io.com.message_status.ingestion"
| summarize AggregatedValue = count() by bin(timestamp, 30m)
| where AggregatedValue >= 1
  QUERY

  severity    = 1
  frequency   = 10
  time_window = 10

  trigger {
    operator  = "GreaterThanOrEqual"
    threshold = 1
  }

  action {
    action_group = [
      azurerm_monitor_action_group.io_com_error.id
    ]
  }
}

resource "azurerm_monitor_scheduled_query_rules_alert" "message-ingestion-count-collect-alert" {
  name                = format("[%s-%s] Message Ingestion Count Collection Error", var.project, var.domain)
  resource_group_name = var.resource_group_name
  location            = var.location

  data_source_id          = var.appi_id
  description             = "[IO-COM] Alerts for the errors during the count collection of message ingested"
  enabled                 = true
  auto_mitigation_enabled = false

  query = <<-QUERY
customEvents
| where name == "io.com.message.collect.count_error"
| summarize AggregatedValue = count() by bin(timestamp, 30m)
| where AggregatedValue >= 1
  QUERY

  severity    = 1
  frequency   = 10
  time_window = 10

  trigger {
    operator  = "GreaterThanOrEqual"
    threshold = 1
  }

  action {
    action_group = [
      azurerm_monitor_action_group.io_com_error.id
    ]
  }
}
