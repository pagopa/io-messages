resource "azurerm_monitor_metric_alert" "alert_nh_partitions_pns_errors" {

  name                = "[IOCOM][NH]Push Notification Service errors"
  resource_group_name = var.resource_group_name

  scopes        = [azurerm_notification_hub.partition_1.id, azurerm_notification_hub.partition_2.id, azurerm_notification_hub.partition_3.id, azurerm_notification_hub.partition_4.id]
  description   = "Notification Hub Partitions incurred in PNS errors, please check. Runbook: not needed."
  severity      = 1
  window_size   = "PT30M"
  frequency     = "PT5M"
  auto_mitigate = false

  dynamic_criteria {
    metric_namespace       = "Microsoft.NotificationHubs/namespaces/notificationHubs"
    metric_name            = "outgoing.allpns.pnserror"
    alert_sensitivity      = "Medium"
    aggregation            = "Total"
    operator               = "GreaterThan"
    skip_metric_validation = false
  }

  # Action groups for alerts
  action {
    action_group_id = var.action_group_id
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "alert_nh_partitions_anomalous_pns_success_volume" {

  name                = "[IOCOM|NH] Push Notification Service anomalous success volume"
  resource_group_name = var.resource_group_name

  enabled = false

  scopes        = [azurerm_notification_hub.partition_1.id, azurerm_notification_hub.partition_2.id, azurerm_notification_hub.partition_3.id, azurerm_notification_hub.partition_4.id]
  description   = "Notification Hub Partitions have an anomalous PNS success volume. Runbook: not needed."
  severity      = 1
  window_size   = "PT5M"
  frequency     = "PT1M"
  auto_mitigate = false

  dynamic_criteria {
    metric_namespace         = "Microsoft.NotificationHubs/namespaces/notificationHubs"
    metric_name              = "outgoing.allpns.success"
    aggregation              = "Total"
    operator                 = "GreaterThan"
    alert_sensitivity        = "High"
    evaluation_total_count   = 1
    evaluation_failure_count = 1
    skip_metric_validation   = false
  }

  # Action groups for alerts
  action {
    action_group_id = var.action_group_id
  }

  tags = var.tags
}

