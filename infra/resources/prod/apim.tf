module "apim" {
  source = "../_modules/apim"

  prefix                = local.prefix
  env_short             = local.env_short
  location_short        = local.location_short
  legacy_location_short = local.legacy_location_short
  domain                = local.domain

  key_vault = module.key_vaults.com

  common_key_vault = data.azurerm_key_vault.weu_common

}
