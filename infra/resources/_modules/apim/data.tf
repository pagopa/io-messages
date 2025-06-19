data "azurerm_api_management" "apim_itn_api" {
  name                = local.apim_itn_name
  resource_group_name = local.apim_itn_resource_group_name
}

data "azurerm_api_management_product" "payment_updater_product_itn" {
  product_id          = "io-payments-api"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
}

data "azurerm_key_vault" "messages_key_vault" {
  name                = "io-p-messages-kv"
  resource_group_name = "io-p-messages-sec-rg"
}

data "azurerm_key_vault_secret" "io_p_messages_sending_func_key" {
  name         = "io-p-messages-sending-func-key"
  key_vault_id = data.azurerm_key_vault.messages_key_vault.id
}

data "azurerm_api_management_product" "apim_itn_product_services" {
  product_id          = "io-services-api"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
}

