locals {
  dns_resolver_naming = {
    prefix          = local.prefix
    name            = local.domain
    environment     = local.env_short
    location        = local.location,
    instance_number = "01"
  }
}

resource "azurerm_subnet" "dns_resolver" {
  name = provider::dx::resource_name(merge(local.dns_resolver_naming, {
    name          = "dnspr",
    resource_type = "subnet",
  }))
  virtual_network_name = data.azurerm_virtual_network.vnet_common_itn.name
  resource_group_name  = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
  address_prefixes     = ["10.20.4.112/28"]

  delegation {
    name = "Microsoft.Network/dnsResolvers"
    service_delegation {
      name    = "Microsoft.Network/dnsResolvers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_private_dns_resolver" "com" {
  name = provider::dx::resource_name(merge(local.dns_resolver_naming, {
    resource_type = "dns_private_resolver",
  }))
  resource_group_name = azurerm_resource_group.itn_com.name
  location            = azurerm_resource_group.itn_com.location
  virtual_network_id  = data.azurerm_virtual_network.vnet_common_itn.id
  tags                = local.tags
}

resource "azurerm_private_dns_resolver_outbound_endpoint" "com" {
  name = provider::dx::resource_name(merge(local.dns_resolver_naming, {
    resource_type = "dns_private_resolver_outbound_endpoint",
  }))
  private_dns_resolver_id = azurerm_private_dns_resolver.com.id
  location                = azurerm_private_dns_resolver.com.location
  subnet_id               = azurerm_subnet.dns_resolver.id
  tags                    = local.tags
}

resource "azurerm_private_dns_resolver_dns_forwarding_ruleset" "com" {
  name = provider::dx::resource_name(merge(local.dns_resolver_naming, {
    resource_type = "dns_forwarding_ruleset",
  }))
  resource_group_name                        = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
  location                                   = azurerm_private_dns_resolver_outbound_endpoint.com.location
  private_dns_resolver_outbound_endpoint_ids = [azurerm_private_dns_resolver_outbound_endpoint.com.id]
  tags                                       = local.tags
}

resource "azurerm_private_dns_resolver_virtual_network_link" "com_vnet_common_itn" {
  name                      = data.azurerm_virtual_network.vnet_common_itn.name
  dns_forwarding_ruleset_id = azurerm_private_dns_resolver_dns_forwarding_ruleset.com.id
  virtual_network_id        = data.azurerm_virtual_network.vnet_common_itn.id
}
