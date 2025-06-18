resource "azurerm_api_management_user" "reminder_user_itn" {
  user_id             = "iopremiumreminderuser"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  first_name          = "Reminder"
  last_name           = "Reminder"
  email               = "io-premium-reminder@pagopa.it"
  state               = "active"
}

resource "azurerm_api_management_group_user" "reminder_group_itn" {
  user_id             = azurerm_api_management_user.reminder_user_itn.user_id
  group_name          = azurerm_api_management_group.apiremindernotify_itn.name
  resource_group_name = azurerm_api_management_user.reminder_user_itn.resource_group_name
  api_management_name = azurerm_api_management_user.reminder_user_itn.api_management_name
}
