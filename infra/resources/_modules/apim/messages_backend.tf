resource "azurerm_api_management_backend" "messages_ca" {
  name                = "${local.product}-itn-messages-ca-01"
  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name

  title       = "IO Messages Container App"
  description = "Backend for the messages container app"
  protocol    = "http"
  url         = "https://${var.messages_ca_url}"
}
