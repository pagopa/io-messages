resource "azurerm_api_management_api_version_set" "communications_v1" {
  name                = "communications_v1"
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name
  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  display_name        = "Communications AppBackend v1"
  versioning_scheme   = "Segment"
}

resource "azurerm_api_management_named_value" "app_backend_key" {
  name                = "io-communications-app-backend-key"
  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name
  display_name        = "io-communications-app-backend-key"
  value               = data.azurerm_key_vault_secret.app_backend_api_key_secret.value
  secret              = true
}

resource "azurerm_api_management_api" "communications" {
  name                  = "io-p-communications-api"
  api_management_name   = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name   = data.azurerm_api_management.apim_itn_platform_api.resource_group_name
  subscription_required = false

  version_set_id = azurerm_api_management_api_version_set.communications_v1.id
  version        = "v1"
  revision       = 1

  description  = "IO Communications AppBackend API"
  display_name = "Communications AppBackend"
  path         = "api/communications"
  protocols    = ["https"]

  import {
    content_format = "openapi-link"
    content_value  = "https://raw.githubusercontent.com/pagopa/io-backend/c8bf12effb373cb60249fa7455eba262bc2bbcaf/openapi/generated/api_communication.yaml"
  }
}

resource "azurerm_api_management_product_api" "io_communications" {
  api_name            = azurerm_api_management_api.communications.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name
  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  product_id          = data.azurerm_api_management_product.apim_platform_domain_product.product_id
}

resource "azurerm_api_management_api_policy" "io_communications" {
  api_name            = azurerm_api_management_api.communications.name
  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name

  xml_content = file("${path.module}/api/backend/_api_base_policy.xml")
}

resource "azurerm_api_management_api_tag" "io_communications_api_tag" {
  api_id = azurerm_api_management_api.communications.id
  name   = azurerm_api_management_tag.io_communications_tag.name
}

