resource "azurerm_notification_hub_namespace" "common" {
  name                = try(local.nonstandard[var.location_short].common_ntfns, "${var.project}-common-ntfns-01")
  resource_group_name = var.resource_group_name
  location            = var.location
  namespace_type      = "NotificationHub"
  sku_name            = "Standard"

  tags = var.tags
}

resource "azurerm_notification_hub" "common" {
  name                = try(local.nonstandard[var.location_short].common_ntf, "${var.project}-common-ntf-01")
  namespace_name      = azurerm_notification_hub_namespace.common.name
  resource_group_name = azurerm_notification_hub_namespace.common.resource_group_name
  location            = azurerm_notification_hub_namespace.common.location

  apns_credential {
    application_mode = local.apns_credential.application_mode
    bundle_id        = local.apns_credential.bundle_id
    team_id          = local.apns_credential.team_id
    key_id           = local.apns_credential.key_id
    token            = data.azurerm_key_vault_secret.ntfns_common_ntf_common_token.value
  }

  gcm_credential {
    api_key = data.azurerm_key_vault_secret.ntfns_common_ntf_common_api_key.value
  }

  tags = var.tags
}

resource "azurerm_role_assignment" "com_devs_notification_hub_common" {
  scope                = azurerm_notification_hub_namespace.common.id
  role_definition_name = "Contributor"
  principal_id         = var.adgroup_com_devs_id
}

resource "azurerm_notification_hub" "common01" {
  name                = "${var.project}-ntf-common01"
  namespace_name      = azurerm_notification_hub_namespace.common.name
  resource_group_name = azurerm_notification_hub_namespace.common.resource_group_name
  location            = azurerm_notification_hub_namespace.common.location

  tags = var.tags
}

resource "azurerm_notification_hub_authorization_rule" "common_default_listen" {
  name                  = "DefaultListenSharedAccessSignature"
  notification_hub_name = azurerm_notification_hub.common.name
  namespace_name        = azurerm_notification_hub_namespace.common.name
  resource_group_name   = azurerm_notification_hub_namespace.common.resource_group_name
  manage                = false
  send                  = false
  listen                = true
}

resource "azurerm_notification_hub_authorization_rule" "common_default_full" {
  name                  = "DefaultFullSharedAccessSignature"
  notification_hub_name = azurerm_notification_hub.common.name
  namespace_name        = azurerm_notification_hub_namespace.common.name
  resource_group_name   = azurerm_notification_hub_namespace.common.resource_group_name
  manage                = true
  send                  = true
  listen                = true
}

resource "azurerm_monitor_metric_alert" "alert_nh_common_pns_errors" {

  name                = "[IOCOM|NHLegacy] Push Notification Service errors"
  resource_group_name = var.resource_group_name

  scopes        = [azurerm_notification_hub.common.id]
  description   = "Notification Hub Legacy incurred in PNS errors, please check. Runbook: not needed."
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

resource "azurerm_monitor_metric_alert" "alert_nh_common_anomalous_pns_success_volume" {

  name                = "[IOCOM|NHLegacy] Push Notification Service anomalous success volume"
  resource_group_name = var.resource_group_name

  enabled = false

  scopes        = [azurerm_notification_hub.common.id]
  description   = "Notification Hub Legacy has an anomalous PNS success volume. Runbook: not needed."
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
