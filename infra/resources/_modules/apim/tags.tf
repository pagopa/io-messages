resource "azurerm_api_management_tag" "io_communications_tag" {
  api_management_id = data.azurerm_api_management.apim_itn_platform_api.id
  name              = "IO-Communications"
}
