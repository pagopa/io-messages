resource "azurerm_api_management_api" "io_backend_notification_itn_api_v1" {
  name                = format("%s-io-backend-notification-api", local.product)
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  revision            = "1"
  display_name        = "IO Backend - Notification API"
  description         = "IO Backend - Notification API"
  api_type            = local.apim_defult_api_type

  path                  = "io-backend-notification/api/v1"
  protocols             = ["https"]
  service_url           = null
  subscription_required = false

  import {
    content_format = "openapi"
    content_value  = file("../_modules/apim/api/io-backend-notification/v1/_openapi.yaml")
  }
}

resource "azurerm_api_management_api_policy" "io_backend_notification_itn_api_v1_policy" {
  api_name            = azurerm_api_management_api.io_backend_notification_itn_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/api/io-backend-notification/v1/_base_policy.xml")
}


resource "azurerm_api_management_product_api" "io_backend_notification_itn_api_v1_product_api" {
  product_id          = azurerm_api_management_product.apim_itn_product_notifications.product_id
  api_name            = azurerm_api_management_api.io_backend_notification_itn_api_v1.name
  api_management_name = azurerm_api_management_api.io_backend_notification_itn_api_v1.api_management_name
  resource_group_name = azurerm_api_management_api.io_backend_notification_itn_api_v1.resource_group_name
}
