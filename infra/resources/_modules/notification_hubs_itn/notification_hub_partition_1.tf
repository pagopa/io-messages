resource "azurerm_notification_hub_namespace" "partition_1" {
  name                = "${var.project}-${var.domain}-nhns-01"
  resource_group_name = var.resource_group_name
  location            = var.location
  namespace_type      = "NotificationHub"
  sku_name            = "Standard"

  tags = var.tags
}

resource "azurerm_notification_hub" "partition_1" {
  name                = "${var.project}-${var.domain}-nh-01"
  namespace_name      = azurerm_notification_hub_namespace.partition_1.name
  resource_group_name = azurerm_notification_hub_namespace.partition_1.resource_group_name
  location            = azurerm_notification_hub_namespace.partition_1.location

  apns_credential {
    application_mode = local.apns_credential.application_mode
    bundle_id        = local.apns_credential.bundle_id
    team_id          = local.apns_credential.team_id
    key_id           = local.apns_credential.key_id
    token            = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=notification-hub-prod-token)"
  }

  gcm_credential {
    api_key = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=notification-hub-prod-api-key)"
  }

  tags = var.tags
}

resource "azurerm_role_assignment" "com_devs_notification_hub_partition_1" {
  scope                = azurerm_notification_hub_namespace.partition_1.id
  role_definition_name = "Contributor"
  principal_id         = var.adgroup_com_devs_id
}

resource "azurerm_notification_hub_authorization_rule" "partition_1_default_listen" {
  name                  = "DefaultListenSharedAccessSignature"
  notification_hub_name = azurerm_notification_hub.partition_1.name
  namespace_name        = azurerm_notification_hub_namespace.partition_1.name
  resource_group_name   = azurerm_notification_hub_namespace.partition_1.resource_group_name
  manage                = false
  send                  = false
  listen                = true
}

resource "azurerm_notification_hub_authorization_rule" "partition_1_default_full" {
  name                  = "DefaultFullSharedAccessSignature"
  notification_hub_name = azurerm_notification_hub.partition_1.name
  namespace_name        = azurerm_notification_hub_namespace.partition_1.name
  resource_group_name   = azurerm_notification_hub_namespace.partition_1.resource_group_name
  manage                = true
  send                  = true
  listen                = true
}
