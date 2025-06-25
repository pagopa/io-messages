resource "azurerm_key_vault_secret" "reminder_subscription_primary_key_itn" {
  name         = "reminder-notification-subscription-key"
  value        = azurerm_api_management_subscription.reminder_itn.primary_key
  content_type = "apim key used by reminder for notify endpoint"
  key_vault_id = local.key_vault.id
}

resource "azurerm_key_vault_secret" "reminder_payment_api_subscription_primary_key_itn" {
  name         = "reminder-paymentup-subscription-key"
  value        = azurerm_api_management_subscription.payment_updater_reminder_itn.primary_key
  content_type = "apim key used by reminder for paymentup endpoint"
  key_vault_id = local.key_vault.id
}
