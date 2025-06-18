resource "azurerm_api_management_subscription" "reminder_itn" {
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  user_id             = azurerm_api_management_user.reminder_user_itn.id
  product_id          = azurerm_api_management_product.apim_itn_product_notifications.id
  display_name        = "Reminder API"
  state               = "active"
  allow_tracing       = false
}

resource "azurerm_key_vault_secret" "reminder_subscription_primary_key_itn" {
  name         = "${format("%s-reminder", local.product)}-subscription-key-itn"
  value        = azurerm_api_management_subscription.reminder_itn.primary_key
  content_type = "subscription key"
  key_vault_id = data.azurerm_key_vault.messages_key_vault.id
}

resource "azurerm_api_management_subscription" "payment_updater_reminder_itn" {
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  user_id             = azurerm_api_management_user.reminder_user_itn.id
  product_id          = data.azurerm_api_management_product.payment_updater_product_itn.id
  display_name        = "Payment Updater API"
  state               = "active"
  allow_tracing       = false
}

resource "azurerm_key_vault_secret" "reminder_payment_api_subscription_primary_key_itn" {
  name         = "${format("%s-reminder-payment-api", local.product)}-subscription-key-itn"
  value        = azurerm_api_management_subscription.payment_updater_reminder_itn.primary_key
  content_type = "subscription key"
  key_vault_id = data.azurerm_key_vault.messages_key_vault.id
}
