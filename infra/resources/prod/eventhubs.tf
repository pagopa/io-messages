module "eventhubs" {
  source = "../_modules/eventhubs"

  prefix    = local.prefix
  env_short = local.env_short
  location  = local.location
  domain    = local.domain

  resource_group_name                  = azurerm_resource_group.itn_com.name
  private_dns_zone_resource_group_name = var.evt_rg_name
  subnet_pep_id                        = data.azurerm_subnet.pep.id
  tags                                 = local.tags
}
