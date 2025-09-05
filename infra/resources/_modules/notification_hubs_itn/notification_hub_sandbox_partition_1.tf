resource "azurerm_notification_hub_namespace" "sandbox" {
  name                = "${var.project}-${var.location_short}-${var.domain}-nhns-sandbox"
  resource_group_name = var.resource_group_name
  location            = var.location
  namespace_type      = "NotificationHub"
  sku_name            = "Standard"

  tags = var.tags
}

resource "azurerm_notification_hub" "sandbox" {
  name                = "${var.project}-${var.location_short}-${var.domain}-nh-sandbox"
  namespace_name      = azurerm_notification_hub_namespace.sandbox.name
  resource_group_name = azurerm_notification_hub_namespace.sandbox.resource_group_name
  location            = azurerm_notification_hub_namespace.sandbox.location

  apns_credential {
    application_mode = local.apns_credential.application_mode
    bundle_id        = local.apns_credential.bundle_id
    team_id          = local.apns_credential.team_id
    key_id           = local.apns_credential.key_id
    token            = data.azurerm_key_vault_secret.notification_hub_dev_token.value
  }

  gcm_credential {
    api_key = data.azurerm_key_vault_secret.notification_hub_dev_api_key.value
  }

  tags = var.tags
}

resource "azurerm_notification_hub_authorization_rule" "sandbox_default_listen" {
  name                  = "DefaultListenSharedAccessSignature"
  notification_hub_name = azurerm_notification_hub.sandbox.name
  namespace_name        = azurerm_notification_hub_namespace.sandbox.name
  resource_group_name   = azurerm_notification_hub_namespace.sandbox.resource_group_name
  manage                = false
  send                  = false
  listen                = true
}

resource "azurerm_notification_hub_authorization_rule" "sandbox_default_full" {
  name                  = "DefaultFullSharedAccessSignature"
  notification_hub_name = azurerm_notification_hub.sandbox.name
  namespace_name        = azurerm_notification_hub_namespace.sandbox.name
  resource_group_name   = azurerm_notification_hub_namespace.sandbox.resource_group_name
  manage                = true
  send                  = true
  listen                = true
}
