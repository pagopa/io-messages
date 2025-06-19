resource "azurerm_api_management_subscription" "reminder_itn" {
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  user_id             = azurerm_api_management_user.reminder_user_itn.id
  product_id          = azurerm_api_management_product.apim_itn_product_notifications.id
  display_name        = "Reminder API"
  state               = "active"
  allow_tracing       = false
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


resource "azurerm_api_management_subscription" "messages_backend_itn" {
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  product_id          = azurerm_api_management_product.apim_itn_product_messages_backend.id
  display_name        = "Messages Backend API"
  state               = "active"
  allow_tracing       = false
}
