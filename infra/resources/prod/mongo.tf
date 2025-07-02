module "mongo" {
  source = "../_modules/mongo"

  resource_group_name = azurerm_resource_group.itn_com.name

  environment = {
    prefix      = local.prefix
    environment = local.env_short
    location    = local.location
    domain      = local.domain
  }

  key_vault_id = module.key_vaults.com.id

  subnet_pep_id = data.azurerm_subnet.pep.id

  tags = local.tags
}
