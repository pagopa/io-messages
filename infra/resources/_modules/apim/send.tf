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
  product_id = azurerm_api_management_product.apim_itn_product_io_com.product_id
  api_name   = azurerm_api_management_api.send_api_v1.name

  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name
}

resource "azurerm_api_management_api" "pn_api_v1" {
  name = format("%s-%s-pn-api-01", local.product, var.location_short)

  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name
  revision            = "1"

  description  = "IO COM PN PUBLIC"
  display_name = "IO COM PN PUBLIC"

  path      = "api/com/v1/pn"
  protocols = ["https"]

  subscription_required = false
  service_url           = null

  import {
    content_format = "openapi-link"
    content_value  = "https://raw.githubusercontent.com/pagopa/io-messages/363a9b80c717364ce6040e0a4681a037562722bd/apps/send-func/openapi/api-pn.yaml"
  }
}

resource "azurerm_api_management_api_policy" "pn_api_v1_policy" {
  api_name = azurerm_api_management_api.pn_api_v1.name

  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name

  xml_link = "https://raw.githubusercontent.com/pagopa/io-messages/8eb3f112e62ca33221e73dda97ab67a96828078a/infra/resources/_modules/apim/api/send/pn-policy.xml"
}

resource "azurerm_api_management_product_api" "pn_api_v1_product_api" {
  product_id = azurerm_api_management_product.apim_itn_product_io_com.product_id
  api_name   = azurerm_api_management_api.pn_api_v1.name

  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name
}
