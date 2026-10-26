module "apim" {
  source = "../_modules/apim"

  prefix                = local.prefix
  env_short             = local.env_short
  location_short        = local.location_short
  legacy_location_short = local.legacy_location_short
  domain                = local.domain

  key_vault = module.key_vaults.com

  messages_ca_url = module.container_apps.messages.url

  messages_api_role = {
    app_role_id                 = module.container_apps.messages_api_authentication.app_role_id
    service_principal_object_id = module.container_apps.messages_api_authentication.service_principal_object_id
  }

  common_key_vault = data.azurerm_key_vault.weu_common

}
