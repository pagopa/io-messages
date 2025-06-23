resource "azurerm_api_management_subscription" "payment_updater_reminder_itn" {
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  user_id             = azurerm_api_management_user.reminder_user_itn.id
  product_id          = azurerm_api_management_product.apim_itn_product_payments.id
  display_name        = "Payment Updater API"
  state               = "active"
  allow_tracing       = false
}

resource "azurerm_api_management_product" "apim_itn_product_payments" {
  product_id   = "io-payments-api"
  display_name = "IO PAYMENTS API"
  description  = "Product for IO payments"

  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  published             = true
  subscription_required = true
  approval_required     = false
}

resource "azurerm_api_management_product_policy" "apim_itn_product_payments_policy" {
  product_id          = azurerm_api_management_product.apim_itn_product_notifications.product_id
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name

  xml_content = file("../_modules/apim/api_product/payments/_base_policy.xml")
}
