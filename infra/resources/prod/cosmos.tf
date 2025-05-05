module "cosmos" {
  source           = "../_modules/cosmos"
  cosmosdb_account = data.azurerm_cosmosdb_account.cosmos_api
  tags             = local.tags
  resource_group   = "io-p-itn-com-rg-01"
  action_group_id  = module.monitoring.action_group.io_com_error_id
  subnet_pep_id    = data.azurerm_subnet.pep.id
  environment = {
    prefix          = local.prefix
    env_short       = local.env_short
    location        = local.location
    app_name        = "com"
    instance_number = "01"
  }
}
