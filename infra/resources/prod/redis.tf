resource "azurerm_redis_cache" "com" {

  name = provider::dx::resource_name({
    prefix          = local.prefix
    name            = "com",
    resource_type   = "redis_cache",
    environment     = local.env_short,
    location        = local.location
    instance_number = 2
  })

  resource_group_name = azurerm_resource_group.itn_com.name
  location            = azurerm_resource_group.itn_com.location

  capacity            = 3
  family              = "P"
  sku_name            = "Premium"
  minimum_tls_version = "1.2"

  redis_configuration {
    authentication_enabled = true
  }

  patch_schedule {
    day_of_week    = "Sunday"
    start_hour_utc = 23
  }

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
    instance_number = 2
  })

  location            = azurerm_resource_group.itn_com.location
  resource_group_name = azurerm_resource_group.itn_com.name
  subnet_id           = data.azurerm_subnet.pep.id

  private_dns_zone_group {
    name                 = "${azurerm_redis_cache.com.name}-private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.privatelink_redis_cache.id]
  }

  private_service_connection {
    name                           = "${azurerm_redis_cache.com.name}-private-service-connection"
    private_connection_resource_id = azurerm_redis_cache.com.id
    is_manual_connection           = false
    subresource_names              = ["redisCache"]
  }

  tags = local.tags
}

resource "azurerm_monitor_metric_alert" "com_redis_memory_alert" {
  name                = "${azurerm_redis_cache.com.name} high memory usage"
  resource_group_name = azurerm_resource_group.itn_com.name
  description         = "Alerts when Redis Cache memory usage exceeds 80%."
  severity            = 1
  enabled             = true

  scopes = [
    azurerm_redis_cache.com.id
  ]

  frequency   = "PT5M"
  window_size = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Cache/redis"
    metric_name      = "usedmemorypercentage"
    aggregation      = "Maximum"
    operator         = "GreaterThanOrEqual"
    threshold        = 80
  }

  action {
    action_group_id = module.monitoring.action_group.id
  }
}
resource "azurerm_monitor_metric_alert" "com_redis_server_load_alert" {
  name                = "${azurerm_redis_cache.com.name} high server load"
  resource_group_name = azurerm_resource_group.itn_com.name
  description         = "Alerts when Redis Cache server load averages above 75% for 5 minutes."
  severity            = 1
  enabled             = true

  scopes = [
    azurerm_redis_cache.com.id
  ]

  frequency   = "PT5M"
  window_size = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Cache/redis"
    metric_name      = "serverLoad"
    aggregation      = "Maximum"
    operator         = "GreaterThan"
    threshold        = 75
  }

  action {
    action_group_id = module.monitoring.action_group.id
  }
}
