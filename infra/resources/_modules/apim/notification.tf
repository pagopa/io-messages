resource "azurerm_api_management_product" "apim_itn_product_notifications" {
  product_id   = "io-notifications-api"
  display_name = "IO NOTIFICATIONS API"
  description  = "Product for IO notifications"

  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  subscription_required = true
  approval_required     = false
  published             = true
}

resource "azurerm_api_management_product_policy" "apim_itn_product_notifications_policy" {
  product_id          = azurerm_api_management_product.apim_itn_product_notifications.product_id
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/api_product/messages/_base_policy.xml")
}


# SENDING FUNC API - INTERNAL

resource "azurerm_api_management_api" "messages_sending_internal_api_v1" {
  name                = format("%s-%s-messages-sending-internal-api-01", local.product, var.legacy_location_short)
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  revision            = "1"

  description  = "IO Messages Sending - Internal - API"
  display_name = "IO Messages Sending - Internal - API"

  path      = "api/v1/messages-sending/internal"
  protocols = ["https"]

  subscription_required = true
  service_url           = null

  import {
    content_format = "openapi"
    content_value  = file("../../../apps/sending-func/openapi/index.yaml")
  }

}

resource "azurerm_api_management_api_policy" "messages_sending_internal_api_v1_policy" {
  api_name            = azurerm_api_management_api.messages_sending_internal_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/api/messages-sending/v1/_base_policy_internal.xml")
}

resource "azurerm_api_management_product_api" "messages_sending_internal_api_v1_product_api" {
  product_id          = azurerm_api_management_product.apim_itn_product_notifications.product_id
  api_name            = azurerm_api_management_api.messages_sending_internal_api_v1.name
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
}

resource "azurerm_api_management_subscription" "reminder_itn" {
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  user_id             = azurerm_api_management_user.reminder_user_itn.id
  product_id          = azurerm_api_management_product.apim_itn_product_notifications.id
  display_name        = "Reminder API"
  state               = "active"
  allow_tracing       = false
}
