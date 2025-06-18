resource "azurerm_api_management_group" "apiremotecontentconfigurationwrite_itn" {
  name                = "apiremotecontentconfigurationwrite"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  display_name        = "ApiRemoteContentConfigurationWrite"
  description         = "A group that enables to write and manage Remote Content Configuration"
}
