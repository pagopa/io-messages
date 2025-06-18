resource "azurerm_api_management_group" "apiremotecontentconfigurationwrite_itn" {
  name                = "apiremotecontentconfigurationwrite"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  display_name        = "ApiRemoteContentConfigurationWrite"
  description         = "A group that enables to write and manage Remote Content Configuration"
}

resource "azurerm_api_management_group" "apithirdpartymessagewrite_itn" {
  name                = "apithirdpartymessagewrite"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  display_name        = "ApiThirdPartyMessageWrite"
  description         = "A group that enables to send Third Party Messages"
}

resource "azurerm_api_management_group" "apimessagewriteadvanced_itn" {
  name                = "apimessagewriteadvanced"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  display_name        = "ApiMessageWriteAdvanced"
  description         = "A group that enables to send Advanced Write Messages"
}

resource "azurerm_api_management_group" "apimessagereadadvanced_itn" {
  name                = "apimessagereadadvanced"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  display_name        = "ApiMessageReadAdvanced"
  description         = "A group that enables to send Advanced Read Messages"
}

resource "azurerm_api_management_group" "apinewmessagenotify_itn" {
  name                = "apinewmessagenotify"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  display_name        = "ApiNewMessageNotify"
  description         = "A group that enables to send a Push notification for a new message"
}

resource "azurerm_api_management_group" "apiremindernotify_itn" {
  name                = "apiremindernotify"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  display_name        = "ApiReminderNotify"
  description         = "A group that enables to send a Push notification for a reminder message"
}

resource "azurerm_api_management_group" "apipaymentupdater_itn" {
  name                = "apipaymentread"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  display_name        = "ApiPaymentRead"
  description         = "A group that enables to read payment status related to a message"
}
