resource "azurerm_notification_hub_namespace" "partition_4" {
  name                = "${var.project}-${var.location_short}-${var.domain}-nhns-04"
  resource_group_name = var.resource_group_name
  location            = var.location
  namespace_type      = "NotificationHub"
  sku_name            = "Standard"

  tags = var.tags
}

resource "azurerm_notification_hub" "partition_4" {
  name                = "${var.project}-${var.location_short}-${var.domain}-nh-04"
  namespace_name      = azurerm_notification_hub_namespace.partition_4.name
  resource_group_name = azurerm_notification_hub_namespace.partition_4.resource_group_name
  location            = azurerm_notification_hub_namespace.partition_4.location

  apns_credential {
    application_mode = local.apns_credential.application_mode
    bundle_id        = local.apns_credential.bundle_id
    team_id          = local.apns_credential.team_id
    key_id           = local.apns_credential.key_id
    token            = data.azurerm_key_vault_secret.notification_hub_prod_token.value
  }

  gcm_credential {
    api_key = data.azurerm_key_vault_secret.notification_hub_prod_api_key.value
  }

  tags = var.tags
}

resource "azurerm_role_assignment" "com_devs_notification_hub_partition_4" {
  scope                = azurerm_notification_hub_namespace.partition_4.id
  role_definition_name = "Contributor"
  principal_id         = var.adgroup_com_devs_id
}

resource "azurerm_notification_hub_authorization_rule" "partition_4_default_listen" {
  name                  = "DefaultListenSharedAccessSignature"
  notification_hub_name = azurerm_notification_hub.partition_4.name
  namespace_name        = azurerm_notification_hub_namespace.partition_4.name
  resource_group_name   = azurerm_notification_hub_namespace.partition_4.resource_group_name
  manage                = false
  send                  = false
  listen                = true
}

resource "azurerm_notification_hub_authorization_rule" "partition_4_default_full" {
  name                  = "DefaultFullSharedAccessSignature"
  notification_hub_name = azurerm_notification_hub.partition_4.name
  namespace_name        = azurerm_notification_hub_namespace.partition_4.name
  resource_group_name   = azurerm_notification_hub_namespace.partition_4.resource_group_name
  manage                = true
  send                  = true
  listen                = true
}
