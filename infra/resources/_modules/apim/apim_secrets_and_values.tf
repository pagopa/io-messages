resource "azurerm_key_vault_secret" "reminder_subscription_primary_key_itn" {
  name         = "${format("%s-reminder", local.product)}-subscription-key-itn"
  value        = azurerm_api_management_subscription.reminder_itn.primary_key
  content_type = "subscription key"
  key_vault_id = data.azurerm_key_vault.messages_key_vault.id
}

resource "azurerm_key_vault_secret" "reminder_payment_api_subscription_primary_key_itn" {
  name         = "${format("%s-reminder-payment-api", local.product)}-subscription-key-itn"
  value        = azurerm_api_management_subscription.payment_updater_reminder_itn.primary_key
  content_type = "subscription key"
  key_vault_id = data.azurerm_key_vault.messages_key_vault.id
}

resource "azurerm_api_management_named_value" "io_p_messages_sending_func_key_itn" {
  name                = "io-p-messages-sending-func-key"
  display_name        = "io-p-messages-sending-func-key"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  value               = data.azurerm_key_vault_secret.io_p_messages_sending_func_key.value
  secret              = "true"
}
