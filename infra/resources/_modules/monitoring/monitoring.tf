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

resource "azurerm_monitor_scheduled_query_rules_alert" "massive_job_start_schedule_batch_failed_alert" {
  name                = format("[%s-%s] Massive Job - StartMassiveNotificationJob schedule batch failed", var.project, var.domain)
  resource_group_name = var.resource_group_name
  location            = var.location

  data_source_id          = var.appi_id
  description             = "[IO-COM] StartMassiveNotificationJob failed to enqueue a batch of notifications on the `process-massive-job` queue. Some tag batches will not be processed and the related users will not receive the notification: investigate the queue/storage availability and consider re-running the affected batches."
  enabled                 = true
  auto_mitigation_enabled = false

  query = <<-QUERY
customEvents
| where name == "massiveJob.StartMassiveNotificationJob.scheduleBatch.failed"
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

resource "azurerm_monitor_scheduled_query_rules_alert" "massive_job_process_queue_message_invalid_alert" {
  name                = format("[%s-%s] Massive Job - ProcessMassiveJob invalid queue message", var.project, var.domain)
  resource_group_name = var.resource_group_name
  location            = var.location

  data_source_id          = var.appi_id
  description             = "[IO-COM] ProcessMassiveJob received a malformed message on the `process-massive-job` queue and discarded it. The associated batch of notifications will NOT be scheduled on Notification Hub: check the producer (StartMassiveNotificationJob) and the queue payload schema."
  enabled                 = true
  auto_mitigation_enabled = false

  query = <<-QUERY
customEvents
| where name == "massiveJob.ProcessMassiveJob.queueMessage.invalid"
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

resource "azurerm_monitor_scheduled_query_rules_alert" "massive_job_process_progress_create_failed_alert" {
  name                = format("[%s-%s] Massive Job - ProcessMassiveJob progress create failed", var.project, var.domain)
  resource_group_name = var.resource_group_name
  location            = var.location

  data_source_id          = var.appi_id
  description             = "[IO-COM] ProcessMassiveJob failed to persist a `massive-progress` document on Cosmos DB after a notification was already scheduled on Notification Hub. The notification will be sent to the users but its delivery status will NOT be tracked by CheckMassiveJob: investigate Cosmos DB availability/throttling and reconcile manually."
  enabled                 = true
  auto_mitigation_enabled = false

  query = <<-QUERY
customEvents
| where name == "massiveJob.ProcessMassiveJob.progress.create.failed"
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

resource "azurerm_monitor_scheduled_query_rules_alert" "massive_job_process_failed_alert" {
  name                = format("[%s-%s] Massive Job - ProcessMassiveJob failed", var.project, var.domain)
  resource_group_name = var.resource_group_name
  location            = var.location

  data_source_id          = var.appi_id
  description             = "[IO-COM] ProcessMassiveJob failed to schedule a batch of notifications on Notification Hub. The users targeted by the affected tags will NOT receive the notification: investigate Notification Hub availability and the involved partition."
  enabled                 = true
  auto_mitigation_enabled = false

  query = <<-QUERY
customEvents
| where name == "massiveJob.ProcessMassiveJob.failed"
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

resource "azurerm_monitor_scheduled_query_rules_alert" "massive_job_check_queue_message_invalid_alert" {
  name                = format("[%s-%s] Massive Job - CheckMassiveJob invalid queue message", var.project, var.domain)
  resource_group_name = var.resource_group_name
  location            = var.location

  data_source_id          = var.appi_id
  description             = "[IO-COM] CheckMassiveJob received a malformed message on the `check-massive-job` queue and discarded it. The final status of the related massive job will NOT be reconciled automatically and it may stay stuck in `PROCESSING`: check the producer (StartMassiveNotificationJob) and the queue payload schema."
  enabled                 = true
  auto_mitigation_enabled = false

  query = <<-QUERY
customEvents
| where name == "massiveJob.CheckMassiveJob.queueMessage.invalid"
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

resource "azurerm_monitor_scheduled_query_rules_alert" "massive_job_check_not_found_alert" {
  name                = format("[%s-%s] Massive Job - CheckMassiveJob job not found", var.project, var.domain)
  resource_group_name = var.resource_group_name
  location            = var.location

  data_source_id          = var.appi_id
  description             = "[IO-COM] CheckMassiveJob could not find the massive job referenced by the queue message on Cosmos DB. The job status cannot be reconciled: investigate inconsistencies between the `massive-jobs` container and the `check-massive-job` queue."
  enabled                 = true
  auto_mitigation_enabled = false

  query = <<-QUERY
customEvents
| where name == "massiveJob.CheckMassiveJob.notFound"
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

resource "azurerm_monitor_scheduled_query_rules_alert" "massive_job_check_notification_not_found_alert" {
  name                = format("[%s-%s] Massive Job - CheckMassiveJob notification not found", var.project, var.domain)
  resource_group_name = var.resource_group_name
  location            = var.location

  data_source_id          = var.appi_id
  description             = "[IO-COM] CheckMassiveJob could not find a previously scheduled notification on Notification Hub while reconciling a massive job. The related progress is forced to `FAILED` and those users will NOT receive the notification: investigate Notification Hub retention/expiration and the affected partition."
  enabled                 = true
  auto_mitigation_enabled = false

  query = <<-QUERY
customEvents
| where name == "massiveJob.CheckMassiveJob.notification.notFound"
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
