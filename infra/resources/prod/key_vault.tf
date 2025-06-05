module "key_vaults" {
  source = "../_modules/key_vaults"

  resource_group_name = azurerm_resource_group.itn_com.name

  tags = local.tags

  environment = {
    prefix      = local.prefix
    location    = local.location
    name        = local.domain,
    environment = local.env_short,
  }

  tenant_id = data.azurerm_client_config.current.tenant_id
}
