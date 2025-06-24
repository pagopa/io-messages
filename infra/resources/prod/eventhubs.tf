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

locals {
  pagopa_core_evhns_pep_name = provider::dx::resource_name({
    prefix          = local.environment.prefix
    domain          = local.environment.domain,
    name            = "pagopa-core-evhns"
    resource_type   = "private_endpoint",
    environment     = local.environment.env_short,
    location        = local.environment.location
    instance_number = 1
  })
}

data "azurerm_private_dns_zone" "privatelink_servicebus" {
  name                = "privatelink.servicebus.windows.net"
  resource_group_name = data.azurerm_resource_group.weu_evt.name
}

resource "azurerm_private_endpoint" "pagopa_core_evhns" {
  name                = local.pagopa_core_evhns_pep_name
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.itn_com.name
  subnet_id           = data.azurerm_subnet.pep.id

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.privatelink_servicebus.id]
  }

  private_service_connection {
    name                           = local.pagopa_core_evhns_pep_name
    private_connection_resource_id = "/subscriptions/b9fc9419-6097-45fe-9f74-ba0641c91912/resourceGroups/pagopa-p-msg-rg/providers/Microsoft.EventHub/namespaces/pagopa-p-weu-core-evh-ns03"
    is_manual_connection           = true
  }
}
