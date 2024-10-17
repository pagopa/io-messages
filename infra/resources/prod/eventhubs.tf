module "eventhubs" {
  source = "../_modules/eventhubs"

  prefix    = local.prefix
  env_short = local.env_short
  location  = local.location
  domain    = local.domain

  resource_group_name                  = data.azurerm_subnet.pep.resource_group_name
  private_dns_zone_resource_group_name = data.azurerm_resource_group.evt-rg.name
  subnet_pep_id                        = data.azurerm_subnet.pep.id
  tags                                 = local.tags
}
