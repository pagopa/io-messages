resource "azurerm_api_management_product" "apim_itn_product_send_aar" {
  product_id   = "io-send-aar-api"
  display_name = "IO SEND AAR API"
  description  = "Product for IO SEND AAR API"

  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name

  approval_required = false
  published         = true
}

resource "azurerm_api_management_product_policy" "apim_itn_product_send_policy" {
  product_id = azurerm_api_management_product.apim_itn_product_send_aar.product_id

  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name

  xml_link = "https://raw.githubusercontent.com/pagopa/io-messages/2b0d3d226b95f731c4a6fdf58daff2e6dfcb4ef0/infra/resources/_modules/apim/product/policy.xml"
}

resource "azurerm_api_management_api" "send_api_v1" {
  name = format("%s-%s-send-aar-api-01", local.product, var.location_short)

  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name
  revision            = "1"

  description  = "IO COM SEND AAR"
  display_name = "IO COM SEND AAR"

  path      = "api/com/v1/send/aar"
  protocols = ["https"]

  subscription_required = false
  service_url           = null

  import {
    content_format = "openapi-link"
    content_value  = "https://raw.githubusercontent.com/pagopa/io-messages/2b0d3d226b95f731c4a6fdf58daff2e6dfcb4ef0/apps/send-func/openapi/aar-notification.yaml"
  }
}


resource "azurerm_api_management_api_policy" "send_aar_api_v1_policy" {
  api_name = azurerm_api_management_api.send_api_v1.name

  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name

  xml_link = "https://raw.githubusercontent.com/pagopa/io-messages/2b0d3d226b95f731c4a6fdf58daff2e6dfcb4ef0/infra/resources/_modules/apim/api/send/policy.xml"
}

resource "azurerm_api_management_product_api" "send_aar_api_v1_product_api" {
  product_id = azurerm_api_management_product.apim_itn_product_send_aar.product_id
  api_name   = azurerm_api_management_api.send_api_v1.name

  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name
}
