resource "azurerm_api_management_product" "apim_itn_product_send_aar" {
  product_id   = "io-send-aar-api"
  display_name = "IO SEND AAR API"
  description  = "Product for IO SEND AAR API"

  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  approval_required = false
  published         = true
}

resource "azurerm_api_management_product_policy" "apim_itn_product_send_policy" {
  product_id          = azurerm_api_management_product.apim_itn_product_send_aar.product_id
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/product/policy.xml")
}

data "http" "send_aar_openapi" {
  url = "https://raw.githubusercontent.com/pagopa/io-messages/d80ef63a1ddf88eec5753ad67007cd365496b2b5/apps/send-func/openapi/aar-notification.yaml"
}

resource "azurerm_api_management_api" "send_api_v1" {
  name                = format("%s-%s-send-aar-api-01", local.product, var.legacy_location_short)
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  revision            = "1"

  description  = "IO Send AAR - API"
  display_name = "IO Send AAR - API"

  path      = "api/v1/send"
  protocols = ["https"]

  subscription_required = true
  service_url           = null

  import {
    content_format = "openapi"
    content_value  = data.http.send_aar_openapi.response_body
  }
}


resource "azurerm_api_management_api_policy" "send_aar_api_v1_policy" {
  api_name            = azurerm_api_management_api.send_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/api/send/policy.xml")
}

resource "azurerm_api_management_product_api" "send_aar_api_v1_product_api" {
  product_id          = azurerm_api_management_product.apim_itn_product_send_aar.product_id
  api_name            = azurerm_api_management_api.send_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
}
