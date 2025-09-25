resource "azurerm_notification_hub_namespace" "partition_2" {
  name                = "${var.project}-${var.domain}-nhns-02"
  resource_group_name = var.resource_group_name
  location            = var.location
  namespace_type      = "NotificationHub"
  sku_name            = "Standard"

  tags = var.tags
}

resource "azurerm_notification_hub" "partition_2" {
  name                = "${var.project}-${var.domain}-nh-02"
  namespace_name      = azurerm_notification_hub_namespace.partition_2.name
  resource_group_name = azurerm_notification_hub_namespace.partition_2.resource_group_name
  location            = azurerm_notification_hub_namespace.partition_2.location

  apns_credential {
    application_mode = local.apns_credential.application_mode
    bundle_id        = local.apns_credential.bundle_id
    team_id          = local.apns_credential.team_id
    key_id           = local.apns_credential.key_id
    token            = data.azurerm_key_vault_secret.ntfns_prod_token.value
  }

  gcm_credential {
    api_key = data.azurerm_key_vault_secret.ntfns_prod_api_key.value
  }

  tags = var.tags
}

resource "azurerm_role_assignment" "com_devs_notification_hub_partition_2" {
  scope                = azurerm_notification_hub_namespace.partition_2.id
  role_definition_name = "Contributor"
  principal_id         = var.adgroup_com_devs_id
}

resource "azurerm_notification_hub_authorization_rule" "partition_2_default_listen" {
  name                  = "DefaultListenSharedAccessSignature"
  notification_hub_name = azurerm_notification_hub.partition_2.name
  namespace_name        = azurerm_notification_hub_namespace.partition_2.name
  resource_group_name   = azurerm_notification_hub_namespace.partition_2.resource_group_name
  manage                = false
  send                  = false
  listen                = true
}

resource "azurerm_notification_hub_authorization_rule" "partition_2_default_full" {
  name                  = "DefaultFullSharedAccessSignature"
  notification_hub_name = azurerm_notification_hub.partition_2.name
  namespace_name        = azurerm_notification_hub_namespace.partition_2.name
  resource_group_name   = azurerm_notification_hub_namespace.partition_2.resource_group_name
  manage                = true
  send                  = true
  listen                = true
}

resource "azurerm_monitor_metric_alert" "alert_nh_partition_2_pns_errors" {

  name                = "[IOCOM|NH Partition 2] Push Notification Service errors"
  resource_group_name = var.resource_group_name

  scopes        = [azurerm_notification_hub.partition_2.id]
  description   = "Notification Hub Partition 2 incurred in PNS errors, please check. Runbook: not needed."
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

resource "azurerm_monitor_metric_alert" "alert_nh_partition_2_anomalous_pns_success_volume" {

  name                = "[IOCOM|NH Partition 2] Push Notification Service anomalous success volume"
  resource_group_name = var.resource_group_name

  enabled = false

  scopes        = [azurerm_notification_hub.partition_2.id]
  description   = "Notification Hub Partition 2 has an anomalous PNS success volume. Runbook: not needed."
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
