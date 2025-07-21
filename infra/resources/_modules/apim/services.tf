data "azurerm_api_management_product" "apim_itn_product_services" {
  product_id          = "io-services-api"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
}

data "http" "remote_content_openapi" {
  url = "https://raw.githubusercontent.com/pagopa/io-messages/refs/heads/main/apps/sending-func/openapi/index_external.yaml"
}

resource "azurerm_api_management_api" "messages_sending_external_api_v1" {
  name                = format("%s-%s-messages-sending-external-api-01", local.product, var.legacy_location_short)
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  revision            = "1"
  description         = "IO Messages Sending - External - API"
  display_name        = "IO Messages Sending - External - API"

  path                  = "api/v1/messages-sending"
  protocols             = ["https"]
  service_url           = null
  subscription_required = true

  import {
    content_format = "openapi"
    content_value  = data.http.remote_content_openapi.response_body
  }
}

resource "azurerm_api_management_api_policy" "messages_sending_external_api_v1_policy" {
  api_name            = azurerm_api_management_api.messages_sending_external_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/api/remote-content/policy.xml")
}

resource "azurerm_api_management_product_api" "messages_sending_external_api_v1_product_api" {
  product_id          = data.azurerm_api_management_product.apim_itn_product_services.product_id
  api_name            = azurerm_api_management_api.messages_sending_external_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
}

resource "azurerm_api_management_api" "messages_api_v1" {
  name                = format("%s-%s-messages-api-01", local.product, var.location_short)
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = var.resource_group_name
  revision            = "1"

  description  = "IO Messages - API"
  display_name = "IO Messages - API"

  path      = "api/v1/messages"
  protocols = ["https"]

  subscription_required = true
  service_url           = null

  import {
    content_format = "openapi-link"
    //TODO: update the commit id once the PR is merged
    content_value = "https://raw.githubusercontent.com/pagopa/io-messages/68a8b247b06206c14c11383089cce4e87d202c15/apps/services-func/openapi/index.yaml"
  }
}

resource "azurerm_api_management_api_policy" "messages_api_v1" {
  api_name            = azurerm_api_management_api.messages_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = var.resource_group_name

  xml_content = file("../_modules/apim/api/messages/policy.xml")
}

resource "azurerm_api_management_product_api" "messages_api_v1" {
  product_id          = data.azurerm_api_management_product.apim_itn_product_services.product_id
  api_name            = azurerm_api_management_api.messages_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = var.resource_group_name
}
