resource "azurerm_notification_hub_namespace" "sandbox_partition_1" {
  name                = try("${local.nonstandard[var.location_short].sandbox_partition_ntfns}-1", "${var.project}-sandbox-partition-ntfns-01")
  resource_group_name = var.legacy_resource_group_name
  location            = var.location
  namespace_type      = "NotificationHub"
  sku_name            = "Standard"

  tags = var.tags
}

resource "azurerm_notification_hub" "sandbox_partition_1" {
  name                = try("${local.nonstandard[var.location_short].sandbox_partition_ntf}-1", "${var.project}-sandbox-partition-ntf-01")
  namespace_name      = azurerm_notification_hub_namespace.sandbox_partition_1.name
  resource_group_name = azurerm_notification_hub_namespace.sandbox_partition_1.resource_group_name
  location            = azurerm_notification_hub_namespace.sandbox_partition_1.location

  apns_credential {
    application_mode = local.apns_credential.application_mode
    bundle_id        = local.apns_credential.bundle_id
    team_id          = local.apns_credential.team_id
    key_id           = local.apns_credential.key_id
    token            = data.azurerm_key_vault_secret.ntfns_common_ntf_common_token_sandbox.value
  }

  gcm_credential {
    api_key = data.azurerm_key_vault_secret.ntfns_common_ntf_common_api_key_sandbox.value
  }

  tags = var.tags
}

resource "azurerm_notification_hub_authorization_rule" "sandbox_partition_1_default_listen" {
  name                  = "DefaultListenSharedAccessSignature"
  notification_hub_name = azurerm_notification_hub.sandbox_partition_1.name
  namespace_name        = azurerm_notification_hub_namespace.sandbox_partition_1.name
  resource_group_name   = azurerm_notification_hub_namespace.sandbox_partition_1.resource_group_name
  manage                = false
  send                  = false
  listen                = true
}

resource "azurerm_notification_hub_authorization_rule" "sandbox_partition_1_default_full" {
  name                  = "DefaultFullSharedAccessSignature"
  notification_hub_name = azurerm_notification_hub.sandbox_partition_1.name
  namespace_name        = azurerm_notification_hub_namespace.sandbox_partition_1.name
  resource_group_name   = azurerm_notification_hub_namespace.sandbox_partition_1.resource_group_name
  manage                = true
  send                  = true
  listen                = true
}
