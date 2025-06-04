module "redis_messages" {
  source = "github.com/pagopa/terraform-azurerm-v4//redis_cache?ref=v1.2.1"

  name                = "${local.project}-msgs-redis-01"
  resource_group_name = data.azurerm_resource_group.itn_messages.name
  location            = data.azurerm_resource_group.itn_messages.location

  capacity              = 2
  family                = "C"
  sku_name              = "Standard"
  redis_version         = "6"
  enable_authentication = true
  zones                 = [1, 2]

  patch_schedules = [{
    day_of_week    = "Sunday"
    start_hour_utc = 23
    },
    {
      day_of_week    = "Monday"
      start_hour_utc = 23
    },
    {
      day_of_week    = "Tuesday"
      start_hour_utc = 23
    },
    {
      day_of_week    = "Wednesday"
      start_hour_utc = 23
    },
    {
      day_of_week    = "Thursday"
      start_hour_utc = 23
    },
  ]

  private_endpoint = {
    enabled              = true
    subnet_id            = data.azurerm_subnet.pep.id
    virtual_network_id   = data.azurerm_virtual_network.vnet_common_itn.id
    private_dns_zone_ids = [data.azurerm_private_dns_zone.privatelink_redis_cache.id]
  }

  tags = local.tags
}


resource "azurerm_redis_cache" "com" {

  name = provider::dx::resource_name({
    prefix          = local.prefix
    name            = "redis",
    domain          = local.domain,
    resource_type   = "redis_cache",
    environment     = local.env_short,
    location        = local.location
    instance_number = 1
  })

  resource_group_name = azurerm_resource_group.itn_com.name
  location            = azurerm_resource_group.itn_com.location

  capacity            = 2
  family              = "C"
  sku_name            = "Standard"
  minimum_tls_version = "1.2"

  redis_configuration {
    authentication_enabled = true
  }

  patch_schedule {
    day_of_week    = "Sunday"
    start_hour_utc = 23
  }

  zones = [1, 2]

  tags = local.tags
}

resource "azurerm_private_endpoint" "redis_cache_com" {

  name = provider::dx::resource_name({
    prefix          = local.prefix
    name            = "redis",
    domain          = local.domain,
    resource_type   = "private_endpoint",
    environment     = local.env_short,
    location        = local.location
    instance_number = 1
  })

  location            = azurerm_resource_group.itn_com.location
  resource_group_name = azurerm_resource_group.itn_com.name
  subnet_id           = data.azurerm_subnet.pep.id

  private_dns_zone_group {
    name                 = "${azurerm_redis_cache.com_redis_messages.name}-private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.privatelink_redis_cache.id]
  }

  private_service_connection {
    name                           = "${azurerm_redis_cache.com_redis_messages.name}-private-service-connection"
    private_connection_resource_id = azurerm_redis_cache.com_redis_messages.id
    is_manual_connection           = false
    subresource_names              = ["redisCache"]
  }

  tags = local.tags
}
