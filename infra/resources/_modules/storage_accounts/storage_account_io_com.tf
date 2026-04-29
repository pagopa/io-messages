module "com_st" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "1.0.1"

  subnet_pep_id       = var.subnet_pep_id
  tags                = var.tags
  tier                = "s"
  environment         = merge(var.environment, { app_name = "com", instance_number = "01" })
  resource_group_name = var.resource_group_name

  subservices_enabled = {
    blob  = true
    file  = false
    queue = true
    table = true
  }
}

resource "azurerm_storage_container" "operations" {
  name                  = "operations"
  storage_account_id    = module.com_st.id
  container_access_type = "private"
}

resource "azurerm_storage_container" "deleted_messages_logs" {
  name                  = "audit-logs"
  storage_account_id    = module.com_st.id
  container_access_type = "private"
}

resource "azurerm_storage_container" "message_content_itn" {
  name                  = "message-content"
  storage_account_id    = module.com_st.id
  container_access_type = "private"
}

resource "azurerm_storage_container_immutability_policy" "deleted_messages_logs" {
  storage_container_resource_manager_id = azurerm_storage_container.deleted_messages_logs.resource_manager_id
  immutability_period_in_days           = 146000
  protected_append_writes_enabled       = true
}

resource "azurerm_storage_container" "processing_message" {
  name               = "processing-message"
  storage_account_id = module.com_st.id
}

resource "azurerm_storage_table" "messages_ingestion_error" {
  name                 = "MessagesDataplanIngestionErrors"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "delete_messages" {
  name                 = "delete-messages"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "push_notifications" {
  name                 = "push-notifications"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "push_notif_notifymessage" {
  name                 = "notify-message"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "message_paymentupdater_failures" {
  name                 = "message-paymentupdater-failures"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "push_notif_notifymessage_poison" {
  name                 = "${azurerm_storage_queue.push_notif_notifymessage.name}-poison"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "push_notifications_poison" {
  name                 = "push-notifications-poison"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "message_created" {
  name                 = "message-created"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "message_created_poison" {
  name                 = "message-created-poison"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "message_processed" {
  name                 = "message-processed"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "message_processed_poison" {
  name                 = "message-processed-poison"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "notification_created" {
  name                 = "notification-created"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "notification_created_poison" {
  name                 = "notification-created-poison"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "webhook_notification" {
  name                 = "webhook-notification"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "webhook_notification_poison" {
  name                 = "webhook-notification-poison"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "update_installations_dispatch" {
  name                 = "update-installations-dispatch"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "update_installations_dispatch_poison" {
  name                 = "update-installations-dispatch-poison"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "check_massive_job" {
  name                 = "check-massive-job"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "check_massive_job_poison" {
  name                 = "check-massive-job-poison"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "process_massive_job" {
  name                 = "process-massive-job"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "process_massive_job_poison" {
  name                 = "process-massive-job-poison"
  storage_account_name = module.com_st.name
}

resource "azurerm_monitor_diagnostic_setting" "io_com_storage_account_diagnostic_setting" {
  name                       = "${module.com_st.name}-ds"
  target_resource_id         = "${module.com_st.id}/queueServices/default"
  log_analytics_workspace_id = var.application_insights_workspace_id

  enabled_log {
    category = "StorageWrite"
  }

  metric {
    category = "Capacity"
    enabled  = false
  }

  metric {
    category = "Transaction"
    enabled  = false
  }
}
