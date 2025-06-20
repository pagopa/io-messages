# NOTIFICATION API PRODUCT

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


# MESSAGES BACKEND API PRODUCT

resource "azurerm_api_management_product" "apim_itn_product_messages_backend" {
  product_id   = "io-messages-backend-api"
  display_name = "IO MESSAGES BACKEND API"
  description  = "Product for IO MESSAGES BACKEND API"

  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  published             = true
  subscription_required = true
  approval_required     = false
}

resource "azurerm_api_management_product_policy" "apim_itn_product_messages_backend_policy" {

  product_id          = azurerm_api_management_product.apim_itn_product_messages_backend.product_id
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/api_product/backend/_base_policy.xml")
}
