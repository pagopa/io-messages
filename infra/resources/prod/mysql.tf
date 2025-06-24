module "mysql" {
  source = "../_modules/mysql"

  environment = {
    prefix    = local.prefix
    env_short = local.env_short
    location  = local.location
    domain    = local.domain
  }

  resource_group_name        = azurerm_resource_group.itn_com.name
  common_resource_group_name = data.azurerm_resource_group.weu_common.name

  subnet_cidrs = {
    com = "10.20.155.16/28"
  }

  virtual_network = {
    resource_group_name = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
    name                = data.azurerm_virtual_network.vnet_common_itn.name
  }

  key_vault = module.key_vaults.com

  tags = local.tags
}
